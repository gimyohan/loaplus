import type { PrismaClient } from '@prisma/client'

import { GUARDIAN_RAID_TARGETS, KURZAN_FRONTLINE_STAGES, pickHighestEligibleTarget } from './contentTargets.js'
import { pickHalHourglassLevel } from './halHourglassCatalog.js'

export const GUARDIAN_REST_GAUGE_MAX = 100
export const GUARDIAN_REST_GAUGE_COST = 20
export const KURZAN_REST_GAUGE_MAX = 200
export const KURZAN_REST_GAUGE_COST = 40
export const PARADISE_TICKET_DEFAULT = 5
export const PARADISE_KEY_DEFAULT = 3

export async function getOrCreateGuardian(prisma: PrismaClient, characterId: string, itemLevel: number) {
  return prisma.guardian.upsert({
    where: { characterId },
    update: {},
    create: {
      characterId,
      targetName: pickHighestEligibleTarget(GUARDIAN_RAID_TARGETS, itemLevel),
      restGauge: 0,
      restGaugeMax: GUARDIAN_REST_GAUGE_MAX,
      restGaugeThreshold: 0,
    },
  })
}

export async function getOrCreateKurzanFrontline(
  prisma: PrismaClient,
  characterId: string,
  itemLevel: number,
) {
  return prisma.kurzanFrontline.upsert({
    where: { characterId },
    update: {},
    create: {
      characterId,
      targetName: pickHighestEligibleTarget(KURZAN_FRONTLINE_STAGES, itemLevel),
      restGauge: 0,
      restGaugeMax: KURZAN_REST_GAUGE_MAX,
      restGaugeThreshold: 0,
    },
  })
}

export async function getOrCreateParadise(prisma: PrismaClient, characterId: string) {
  return prisma.paradise.upsert({
    where: { characterId },
    update: {},
    create: {
      characterId,
      ticketCount: PARADISE_TICKET_DEFAULT,
      keyCount: PARADISE_KEY_DEFAULT,
    },
  })
}

export async function getOrCreateEbonyCube(prisma: PrismaClient, characterId: string) {
  return prisma.ebonyCube.upsert({
    where: { characterId },
    update: {},
    create: { characterId },
  })
}

export async function getOrCreateHalHourglass(prisma: PrismaClient, characterId: string, itemLevel: number) {
  return prisma.halHourglass.upsert({
    where: { characterId },
    update: {},
    create: {
      characterId,
      level: pickHalHourglassLevel(itemLevel),
    },
  })
}

/**
 * 시련의 모래 스택 +1(최대 5, 이미 5면 그대로) — 할의 모래시계 위젯의 전용 획득 버튼과, 쿠르잔
 * 전선이 혼돈의 균열 구간일 때의 "티켓" 퀵액션이 공유하는 로직이다(docs/ebony_cube_hal_hourglass.typ
 * "쿠르잔 전선 위젯 변경" 참고). 로그를 남기지 않는 단순 적립이다.
 */
export async function collectHalHourglassSand(prisma: PrismaClient, characterId: string, itemLevel: number) {
  const hourglass = await getOrCreateHalHourglass(prisma, characterId, itemLevel)
  if (hourglass.sandStack >= 5) return hourglass
  return prisma.halHourglass.update({
    where: { characterId },
    data: { sandStack: hourglass.sandStack + 1 },
  })
}

/**
 * 캐릭터 새로고침(아이템 레벨 갱신) 뒤에 호출한다. target_auto_managed가 true인 콘텐츠만
 * 새 아이템 레벨 기준 최고 목표로 다시 맞추고, 유저가 직접 고른(false) 콘텐츠는 건드리지 않는다.
 * 가디언/쿠르잔 행이 아직 없는 캐릭터(위젯을 한 번도 안 연 경우)는 새로고침만으로 만들지 않는다.
 */
export async function syncAutoManagedTargets(
  prisma: PrismaClient,
  characterId: string,
  itemLevel: number,
) {
  const [guardian, kurzan] = await Promise.all([
    prisma.guardian.findUnique({ where: { characterId } }),
    prisma.kurzanFrontline.findUnique({ where: { characterId } }),
  ])

  if (guardian?.targetAutoManaged) {
    const targetName = pickHighestEligibleTarget(GUARDIAN_RAID_TARGETS, itemLevel)
    if (targetName !== guardian.targetName) {
      await prisma.guardian.update({ where: { characterId }, data: { targetName } })
    }
  }

  if (kurzan?.targetAutoManaged) {
    const targetName = pickHighestEligibleTarget(KURZAN_FRONTLINE_STAGES, itemLevel)
    if (targetName !== kurzan.targetName) {
      await prisma.kurzanFrontline.update({ where: { characterId }, data: { targetName } })
    }
  }

  // 할의 모래시계는 유저 수동 override가 없어(target_auto_managed 컬럼 자체가 없음) 행이
  // 이미 존재하면 항상 새 레벨로 다시 맞춘다 — 가디언/쿠르잔과 달리 조건 없이 무조건 재계산.
  const halHourglass = await prisma.halHourglass.findUnique({ where: { characterId } })
  if (halHourglass) {
    const level = pickHalHourglassLevel(itemLevel)
    if (level !== halHourglass.level) {
      await prisma.halHourglass.update({ where: { characterId }, data: { level } })
    }
  }
}
