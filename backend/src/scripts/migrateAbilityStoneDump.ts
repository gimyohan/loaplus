import { open } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'
import type { Prisma } from '@prisma/client'
import { PrismaClient } from '@prisma/client'

// sandbox/ability_stone/main.cpp의 export_migration_dump가 쓰는 포맷 그대로 파싱한다
// (docs/ability_stone.typ "migration_dump.bin 포맷" 참고). 일회성 스크립트라 이 파일에서만 쓰는
// 파싱 로직이며, 실행 중인 백엔드 프로세스와는 무관하다.
const HEADER_SIZE = 16
const DIM_COUNT = 7
const OUTCOME_COUNT = 100 // 5(major) x 5(minor) x 4(debuff)
const RECORD_SIZE = 4 /* state_key */ + DIM_COUNT /* uint8 x 7 */ + OUTCOME_COUNT * 8 /* double x 100 */ + OUTCOME_COUNT /* int8 x 100 */
const BATCH_RECORDS = 1000

const ACTION_LABELS: Record<number, 'MAJOR' | 'MINOR' | 'DEBUFF' | null> = {
  0: 'MAJOR',
  1: 'MINOR',
  2: 'DEBUFF',
  [-1]: null,
}

interface OutcomeEntry {
  majorLevel: number
  minorLevel: number
  debuffLevel: number
  probability: number
  bestAction: 'MAJOR' | 'MINOR' | 'DEBUFF' | null
}

interface ParsedRecord {
  stateKey: number
  majorFailCnt: number
  minorFailCnt: number
  debuffSuccCnt: number
  majorRemCnt: number
  minorRemCnt: number
  debuffRemCnt: number
  currProbabilityIdx: number
  outcomes: OutcomeEntry[]
}

function parseRecord(buf: Buffer): ParsedRecord {
  const stateKey = buf.readInt32LE(0)
  const majorFailCnt = buf.readUInt8(4)
  const minorFailCnt = buf.readUInt8(5)
  const debuffSuccCnt = buf.readUInt8(6)
  const majorRemCnt = buf.readUInt8(7)
  const minorRemCnt = buf.readUInt8(8)
  const debuffRemCnt = buf.readUInt8(9)
  const currProbabilityIdx = buf.readUInt8(10)

  const probabilityBase = 11
  const actionBase = probabilityBase + OUTCOME_COUNT * 8

  // i,j,k 순서로 순회, 배열 인덱스 = i*20 + j*4 + k (docs/db_schema.typ의 outcomes 설명과 동일).
  const outcomes: OutcomeEntry[] = []
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      for (let k = 0; k < 4; k++) {
        const idx = i * 20 + j * 4 + k
        const probability = buf.readDoubleLE(probabilityBase + idx * 8)
        const actionCode = buf.readInt8(actionBase + idx)
        outcomes.push({
          majorLevel: i,
          minorLevel: j,
          debuffLevel: k,
          probability,
          bestAction: ACTION_LABELS[actionCode] ?? null,
        })
      }
    }
  }

  return {
    stateKey,
    majorFailCnt,
    minorFailCnt,
    debuffSuccCnt,
    majorRemCnt,
    minorRemCnt,
    debuffRemCnt,
    currProbabilityIdx,
    outcomes,
  }
}

function defaultDumpPath(): string {
  const scriptDir = dirname(fileURLToPath(import.meta.url))
  // src/scripts/ -> src -> backend -> workspace -> 리포지토리 루트 -> sandbox/ability_stone/...
  return resolve(scriptDir, '../../../../sandbox/ability_stone/migration_dump.bin')
}

function parseArgs(argv: string[]): { dumpPath: string; limit: number | null } {
  let dumpPath = defaultDumpPath()
  let limit: number | null = null
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length))
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`invalid --limit value: ${arg}`)
      }
      limit = parsed
    } else {
      dumpPath = resolve(arg)
    }
  }
  return { dumpPath, limit }
}

async function main() {
  const { dumpPath, limit } = parseArgs(process.argv.slice(2))
  console.log(`reading ${dumpPath}${limit !== null ? ` (--limit=${limit})` : ''}`)

  const fh = await open(dumpPath, 'r')
  const prisma = new PrismaClient()

  try {
    const header = Buffer.alloc(HEADER_SIZE)
    const headerRead = await fh.read(header, 0, HEADER_SIZE, 0)
    if (headerRead.bytesRead < HEADER_SIZE) {
      throw new Error(`file too short for header: got ${headerRead.bytesRead} bytes`)
    }
    const magic = header.toString('ascii', 0, 4)
    if (magic !== 'ABST') {
      throw new Error(`unexpected magic bytes: "${magic}" (expected "ABST")`)
    }
    const version = header.readUInt32LE(4)
    const recordCount = Number(header.readBigUInt64LE(8))
    console.log(`dump version=${version} recordCount=${recordCount}`)

    const targetCount = limit !== null ? Math.min(limit, recordCount) : recordCount

    // 매 실행마다 전체를 다시 채운다 (docs/db_schema.typ "Ability_Stone_Dp_States" 마이그레이션 설명 참고).
    const deleted = await prisma.abilityStoneDpState.deleteMany({})
    console.log(`cleared ${deleted.count} existing rows`)

    const chunkBuf = Buffer.alloc(BATCH_RECORDS * RECORD_SIZE)
    let position = HEADER_SIZE
    let processed = 0
    let inserted = 0
    const startedAt = Date.now()

    while (processed < targetCount) {
      const recordsThisRead = Math.min(BATCH_RECORDS, targetCount - processed)
      const bytesToRead = recordsThisRead * RECORD_SIZE
      const { bytesRead } = await fh.read(chunkBuf, 0, bytesToRead, position)
      if (bytesRead < bytesToRead) {
        throw new Error(`unexpected EOF at position ${position}: expected ${bytesToRead} bytes, got ${bytesRead}`)
      }
      position += bytesRead

      const batch = []
      for (let i = 0; i < recordsThisRead; i++) {
        const record = parseRecord(chunkBuf.subarray(i * RECORD_SIZE, (i + 1) * RECORD_SIZE))
        batch.push({
          stateKey: record.stateKey,
          majorFailCnt: record.majorFailCnt,
          minorFailCnt: record.minorFailCnt,
          debuffSuccCnt: record.debuffSuccCnt,
          majorRemCnt: record.majorRemCnt,
          minorRemCnt: record.minorRemCnt,
          debuffRemCnt: record.debuffRemCnt,
          currProbabilityIdx: record.currProbabilityIdx,
          outcomes: record.outcomes as unknown as Prisma.InputJsonValue,
        })
      }

      await prisma.abilityStoneDpState.createMany({ data: batch })
      inserted += batch.length
      processed += recordsThisRead

      if (processed === targetCount || processed % 50000 === 0) {
        const elapsedSec = (Date.now() - startedAt) / 1000
        console.log(`progress: ${processed}/${targetCount} rows (${elapsedSec.toFixed(1)}s elapsed)`)
      }
    }

    console.log(`done: ${inserted} rows inserted`)
  } finally {
    await fh.close()
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
