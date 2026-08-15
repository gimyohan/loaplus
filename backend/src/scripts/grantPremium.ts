import 'dotenv/config'
import type { Character, User } from '@prisma/client'
import { PrismaClient } from '@prisma/client'

// docs/subscription.typ "프리미엄 수동 부여: CLI 스크립트" 참고. 결제 연동 전까지 운영 목적으로
// 특정 유저에게 프리미엄을 부여/연장하는 유일한 방법 — 관리자 HTTP 엔드포인트는 의도적으로 두지
// 않는다(터미널 접근 가능한 운영자만 실행하면 충분, 새 엔드포인트는 불필요한 공격 표면).

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MS_PER_DAY = 24 * 60 * 60 * 1000

type UserWithCharacters = User & { characters: Pick<Character, 'characterName' | 'serverName'>[] }

function parseArgs(argv: string[]): { query: string; days: number } {
  const [query, daysRaw] = argv
  if (!query || !daysRaw) {
    throw new Error('사용법: npm run grant-premium -- <userId|depositCode|nickname|characterName> <days>')
  }
  const days = Number(daysRaw)
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error(`days는 1 이상의 정수여야 합니다: "${daysRaw}"`)
  }
  return { query, days }
}

/**
 * query 해석 순서(docs/subscription.typ "프리미엄 수동 부여" 참고): (1) UUID면 id로 정확히
 * 조회, (2) deposit_code에 대소문자 무시 정확히 일치(고유값이라 모호함 없음 — 무통장입금
 * 운영에서는 입금자명이 곧 deposit_code라 이 경로가 기본 흐름이 된다), (3) 그 외에는 nickname
 * 또는 보유 캐릭터 이름에 대소문자 무시 부분일치하는 유저를 전부 반환한다.
 */
async function findCandidateUsers(prisma: PrismaClient, query: string): Promise<UserWithCharacters[]> {
  const characterSelect = { select: { characterName: true, serverName: true } } as const

  if (UUID_REGEX.test(query)) {
    const user = await prisma.user.findUnique({ where: { id: query }, include: { characters: characterSelect } })
    return user ? [user] : []
  }

  const byDepositCode = await prisma.user.findFirst({
    where: { depositCode: { equals: query, mode: 'insensitive' } },
    include: { characters: characterSelect },
  })
  if (byDepositCode) return [byDepositCode]

  return prisma.user.findMany({
    where: {
      OR: [
        { nickname: { contains: query, mode: 'insensitive' } },
        { characters: { some: { characterName: { contains: query, mode: 'insensitive' } } } },
      ],
    },
    include: { characters: characterSelect },
  })
}

function describeUser(user: UserWithCharacters): string {
  const characters =
    user.characters.map((c) => `${c.characterName}(${c.serverName})`).join(', ') || '(캐릭터 없음)'
  return `${user.id}  닉네임=${user.nickname ?? '(없음)'}  입금코드=${user.depositCode}  캐릭터=${characters}`
}

async function main() {
  const { query, days } = parseArgs(process.argv.slice(2))
  const prisma = new PrismaClient()

  try {
    const candidates = await findCandidateUsers(prisma, query)

    if (candidates.length === 0) {
      console.error(`일치하는 유저를 찾지 못했습니다: "${query}"`)
      process.exitCode = 1
      return
    }

    if (candidates.length > 1) {
      console.error(`"${query}"에 일치하는 유저가 ${candidates.length}명입니다 — 특정 id로 다시 실행하세요:`)
      for (const candidate of candidates) console.error('  ' + describeUser(candidate))
      process.exitCode = 1
      return
    }

    const user = candidates[0]
    const now = new Date()
    const currentExpiry = user.premiumExpiresAt
    // 아직 유효한 구독이 있으면 그 만료일 뒤로 이어 붙이고(연장), 없거나 만료됐으면 오늘부터
    // 새로 시작한다 (docs/subscription.typ "연장 방식" 참고).
    const isCurrentlyActive = currentExpiry !== null && currentExpiry.getTime() > now.getTime()
    const base = isCurrentlyActive ? currentExpiry : now
    const newExpiry = new Date(base.getTime() + days * MS_PER_DAY)

    await prisma.user.update({ where: { id: user.id }, data: { premiumExpiresAt: newExpiry } })

    console.log(`대상: ${describeUser(user)}`)
    console.log(`기존 만료: ${currentExpiry ? currentExpiry.toISOString() : '(구독 이력 없음)'}`)
    console.log(
      `새 만료:   ${newExpiry.toISOString()} (+${days}일, ${isCurrentlyActive ? '기존 만료일 기준 연장' : '오늘부터 시작'})`,
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
