import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

import type { RaidGateState } from './actionLogs.js'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const WEDNESDAY = 3

/** date를 KST 벽시계 필드로 읽을 수 있도록, UTC 필드가 KST 값이 되게 이동시킨 가짜 Date. */
function toKstWallClock(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS)
}

function fromKstWallClock(kstWallClock: Date): Date {
  return new Date(kstWallClock.getTime() - KST_OFFSET_MS)
}

/** date 시점 기준 가장 최근에 지난 "매일 06:00 KST" 경계를 실제 시각(UTC)으로 반환한다. */
export function mostRecentDailyBoundary(date: Date): Date {
  const kst = toKstWallClock(date)
  const boundaryKst = new Date(kst)
  boundaryKst.setUTCHours(6, 0, 0, 0)
  if (boundaryKst.getTime() > kst.getTime()) {
    boundaryKst.setUTCDate(boundaryKst.getUTCDate() - 1)
  }
  return fromKstWallClock(boundaryKst)
}

/** date 시점 기준 가장 최근에 지난 "수요일 06:00 KST" 경계를 실제 시각(UTC)으로 반환한다. */
export function mostRecentWeeklyBoundary(date: Date): Date {
  const dailyBoundaryKst = toKstWallClock(mostRecentDailyBoundary(date))
  const daysSinceWednesday = (dailyBoundaryKst.getUTCDay() - WEDNESDAY + 7) % 7
  dailyBoundaryKst.setUTCDate(dailyBoundaryKst.getUTCDate() - daysSinceWednesday)
  return fromKstWallClock(dailyBoundaryKst)
}

/**
 * date가 속하는 통계 주간의 week_start_date(그 주의 수요일 06:00 KST가 속하는 KST 날짜)를
 * DATE 컬럼에 저장 가능한 자정 UTC Date로 반환한다 (docs/statistics.typ "주간 경계 정의" 참고).
 * Character_Statistics_Weekly/Character_Item_Reward_Stats의 PK 계산에 쓰인다.
 */
export function weekStartDateKey(date: Date): Date {
  const boundaryKst = toKstWallClock(mostRecentWeeklyBoundary(date))
  return new Date(Date.UTC(boundaryKst.getUTCFullYear(), boundaryKst.getUTCMonth(), boundaryKst.getUTCDate()))
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const ALL_DAYS_MASK = 0b1111111 // 7비트 전부 (일~토)

/**
 * lastVisitedAtMs와 now 사이에 크로스된 "매일 06:00 KST" 경계들의 요일을 7비트 비트마스크로
 * 반환한다 — 비트 i는 그 경계가 속한 KST 날짜의 getUTCDay() 값 i(0=일~6=토)에 대응한다
 * (docs/db_schema.typ의 Dashboard_Widgets "텍스트&체크박스 예시" resetDays와 동일한 인코딩).
 * 방문 간격이 지연 평가라 여러 날치를 한꺼번에 처리할 수 있으므로, "오늘 요일"만 보지 않고
 * 그 사이 지나간 모든 날짜의 요일을 전부 모은다 — 7일 이상 비었으면 모든 요일이 최소 한 번은
 * 지나갔다는 뜻이라 더 거슬러 올라가지 않고 즉시 전체 비트를 반환한다.
 */
function crossedDailyBoundaryDaysMask(lastVisitedAtMs: number, now: Date): number {
  let boundary = mostRecentDailyBoundary(now)
  let mask = 0
  for (let i = 0; i < 7; i++) {
    if (boundary.getTime() <= lastVisitedAtMs) break
    mask |= 1 << toKstWallClock(boundary).getUTCDay()
    if (mask === ALL_DAYS_MASK) break
    boundary = new Date(boundary.getTime() - MS_PER_DAY)
  }
  return mask
}

/**
 * lastVisitedAtMs와 now 사이에 크로스된 "매일 06:00 KST" 경계의 개수. 마지막 방문이 없으면(첫
 * 방문) 1로 본다. applyLazyReset은 dailyCrossed일 때만 부르므로 항상 1 이상이다.
 */
export function crossedDailyBoundaryCount(lastVisitedAtMs: number, now: Date): number {
  if (!Number.isFinite(lastVisitedAtMs)) return 1
  const lastBoundary = mostRecentDailyBoundary(new Date(lastVisitedAtMs))
  return Math.round((mostRecentDailyBoundary(now).getTime() - lastBoundary.getTime()) / MS_PER_DAY)
}

/** crossedDailyBoundaryCount의 주간판 — 지나간 "수요일 06:00 KST" 경계의 개수(첫 방문이면 1). */
export function crossedWeeklyBoundaryCount(lastVisitedAtMs: number, now: Date): number {
  if (!Number.isFinite(lastVisitedAtMs)) return 1
  const lastBoundary = mostRecentWeeklyBoundary(new Date(lastVisitedAtMs))
  return Math.round((mostRecentWeeklyBoundary(now).getTime() - lastBoundary.getTime()) / (7 * MS_PER_DAY))
}

const REST_GAUGE_DAILY_REFILL_RATIO = 0.1

/**
 * 가디언/쿠르잔 전선의 일일 초기화를, 방문 간격 동안 지나간 경계 개수(crossedCount)만큼 한꺼번에
 * 반영한다. 경계 하나마다 "그날 수확했으면 플래그만 끄고, 안 했으면 게이지 10% 충전"이 적용되는데,
 * 수확 플래그는 가장 오래된 첫 경계에서만 켜져 있었으므로 그 경계는 플래그만 끄고 나머지
 * (crossedCount - 1)개 경계는 모두 쉰 날이라 각각 10%씩 충전한다. 예전엔 방문 간격과 무관하게
 * 한 번만 적용해, 이틀 이상 비웠다 접속하면 수확한 다음 날의 충전분이 통째로 누락됐다.
 */
export function applyHarvestDailyResets(
  state: { isHarvested: boolean; restGauge: number; restGaugeMax: number },
  crossedCount: number,
): { restGauge: number } {
  const refillCount = state.isHarvested ? crossedCount - 1 : crossedCount
  // 충전할 경계가 없으면 게이지를 건드리지 않는다 — 상한 클램프로 기존 값을 깎지 않기 위함.
  if (refillCount <= 0) return { restGauge: state.restGauge }
  const refill = Math.round(state.restGaugeMax * REST_GAUGE_DAILY_REFILL_RATIO) * refillCount
  return { restGauge: Math.min(state.restGauge + refill, state.restGaugeMax) }
}

const RETENTION_DAYS = 90

/**
 * 3개월(90일) 리텐션 컷오프 날짜. week_start_date가 이 값보다 과거인 행은 삭제 대상이다
 * (docs/statistics.typ "3개월 리텐션 정책" 참고). now는 실제 현재 시각을 받는다 — 롤백처럼
 * 과거 시각으로 버킷을 계산하는 경우에도 컷오프 자체는 항상 "지금" 기준이어야 한다.
 */
export function retentionCutoffDate(now: Date): Date {
  const kst = toKstWallClock(now)
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - RETENTION_DAYS))
}

interface TextCheckboxCustomData {
  text: string
  isChecked: boolean
  /** 7비트 요일 비트마스크. 0이면 자동 초기화 없음(docs/db_schema.typ 참고). */
  resetDays: number
}

interface LazyResetContext {
  prisma: PrismaClient
  characterIds: string[]
  /** 'daily' 대상만 쓴다. dailyCrossed가 false면 항상 0(대상 자체가 실행되지 않으므로 무의미). */
  crossedDaysMask: number
  /** 'daily' 대상만 쓴다. 방문 간격 동안 지나간 06:00 KST 경계의 개수(dailyCrossed면 1 이상). */
  crossedDailyCount: number
  /** 'weekly' 대상만 쓴다. 방문 간격 동안 지나간 수요일 06:00 KST 경계의 개수(weeklyCrossed면 1 이상). */
  crossedWeeklyCount: number
}

interface LazyResetTarget {
  /** docs/reset_logic.typ "지연 초기화 대상 레지스트리" 표의 행 이름과 반드시 일치시킨다. */
  name: string
  boundary: 'daily' | 'weekly'
  collectOperations(ctx: LazyResetContext): Promise<Prisma.PrismaPromise<unknown>[]>
}

/**
 * "지금 어떤 데이터가 지연 초기화 대상인가"를 이 배열 하나로 한눈에 볼 수 있게 한다 — 위젯마다
 * 초기화 로직을 흩어두면 전체 목록을 알기 위해 라우트 파일들을 일일이 뒤져야 하는 문제를
 * 해결하기 위한 구조다. 새 컨텐츠에 지연 초기화가 필요해지면 이 배열에 항목을 추가하고
 * docs/reset_logic.typ의 표도 함께 갱신한다. applyLazyReset 본체는 이 목록을 순회할 뿐 각
 * 대상이 무엇을 하는지 알지 못한다.
 */
const LAZY_RESET_TARGETS: LazyResetTarget[] = [
  {
    name: 'guardian_harvest',
    boundary: 'daily',
    // '오늘 수확'이 켜져 있었으면 플래그만 되돌리고, 꺼져 있었으면(그날 쉬었으면) 대신
    // rest_gauge를 rest_gauge_max의 10%만큼 채운다(캡 있음) — 두 처리는 상호 배타적이다
    // (docs/db_schema.typ의 Users "초기화 적용 범위" 참고). rest_gauge_max가 행마다 다를 수 있어
    // updateMany로 일괄 계산할 수 없으므로 개별 조회 후 갱신한다.
    async collectOperations({ prisma, characterIds, crossedDailyCount }) {
      const operations: Prisma.PrismaPromise<unknown>[] = []
      const guardians = await prisma.guardian.findMany({ where: { characterId: { in: characterIds } } })
      for (const guardian of guardians) {
        const { restGauge } = applyHarvestDailyResets(guardian, crossedDailyCount)
        if (!guardian.isHarvested && restGauge === guardian.restGauge) continue
        operations.push(
          prisma.guardian.update({
            where: { characterId: guardian.characterId },
            data: guardian.isHarvested
              ? { isHarvested: false, restGaugeConsumedByHarvest: false, restGauge }
              : { restGauge },
          }),
        )
      }
      return operations
    },
  },
  {
    name: 'kurzan_harvest',
    boundary: 'daily',
    // guardian_harvest와 완전히 동일한 규칙을 별도 테이블(Kurzan_Frontlines)에 적용한다.
    async collectOperations({ prisma, characterIds, crossedDailyCount }) {
      const operations: Prisma.PrismaPromise<unknown>[] = []
      const kurzans = await prisma.kurzanFrontline.findMany({ where: { characterId: { in: characterIds } } })
      for (const kurzan of kurzans) {
        const { restGauge } = applyHarvestDailyResets(kurzan, crossedDailyCount)
        if (!kurzan.isHarvested && restGauge === kurzan.restGauge) continue
        operations.push(
          prisma.kurzanFrontline.update({
            where: { characterId: kurzan.characterId },
            data: kurzan.isHarvested
              ? { isHarvested: false, restGaugeConsumedByHarvest: false, restGauge }
              : { restGauge },
          }),
        )
      }
      return operations
    },
  },
  {
    name: 'text_checkbox_widgets',
    boundary: 'daily',
    // 지나간 요일들 중 하나라도 resetDays에 켜져 있으면 isChecked를 되돌린다. remainingCount는
    // 건드리지 않는다 — customData를 그대로 스프레드하므로 다른 필드(text, remainingCount 등)는
    // 자연히 보존된다(docs/db_schema.typ 참고).
    async collectOperations({ prisma, characterIds, crossedDaysMask }) {
      const operations: Prisma.PrismaPromise<unknown>[] = []
      const checkboxWidgets = await prisma.dashboardWidget.findMany({
        where: { characterId: { in: characterIds }, widgetType: 'TEXT_CHECKBOX' },
      })
      for (const widget of checkboxWidgets) {
        const customData = widget.customData as TextCheckboxCustomData | null
        if (!customData?.isChecked) continue
        if ((customData.resetDays & crossedDaysMask) === 0) continue
        operations.push(
          prisma.dashboardWidget.update({
            where: { id: widget.id },
            data: { customData: { ...customData, isChecked: false } as unknown as Prisma.InputJsonValue },
          }),
        )
      }
      return operations
    },
  },
  {
    name: 'paradise_auto_recharge',
    boundary: 'weekly',
    // 캐릭터마다 티켓/열쇠 값이 달라 updateMany로 일괄 계산할 수 없다
    // (workspace/frontend/src/lib/paradise.ts의 applyParadiseWeeklyRecharge와 동일한 공식).
    // 티켓은 "5 미만이면 5로"라 몇 주가 지나도 결과가 같지만(멱등), 열쇠는 +3 누적이라 지나간
    // 주간 경계 개수만큼 곱해야 한다 — 몇 주 비웠다 접속해도 주마다 +3이 빠지지 않게 한다.
    async collectOperations({ prisma, characterIds, crossedWeeklyCount }) {
      const operations: Prisma.PrismaPromise<unknown>[] = []
      const paradises = await prisma.paradise.findMany({
        where: { characterId: { in: characterIds }, autoRecharge: true },
      })
      for (const paradise of paradises) {
        operations.push(
          prisma.paradise.update({
            where: { characterId: paradise.characterId },
            data: {
              ticketCount: Math.max(paradise.ticketCount, 5),
              keyCount: paradise.keyCount + 3 * crossedWeeklyCount,
            },
          }),
        )
      }
      return operations
    },
  },
  {
    name: 'raid_gates',
    boundary: 'weekly',
    // 관문 완료 여부와 '더보기' 설정을 함께 초기화한다 — '더보기'는 그 주에 추가 보상을
    // 구매했는지 표시하는 용도라 완료 여부와 같은 주기로 초기화되는 것이 자연스럽다
    // (docs/widgets.typ "레이드" 참고). gates 배열 자체를 다시 만들어야 해서 개별 조회 후 갱신한다.
    async collectOperations({ prisma, characterIds }) {
      const operations: Prisma.PrismaPromise<unknown>[] = []
      const raids = await prisma.characterRaid.findMany({ where: { characterId: { in: characterIds } } })
      for (const raid of raids) {
        const gates = (raid.gates as unknown as RaidGateState[]).map((gate) => ({
          ...gate,
          cleared: false,
          moreRewardEnabled: false,
        }))
        operations.push(
          prisma.characterRaid.update({
            where: { id: raid.id },
            data: { gates: gates as unknown as Prisma.InputJsonValue },
          }),
        )
      }
      return operations
    },
  },
  {
    name: 'hal_hourglass_completion',
    boundary: 'weekly',
    // 완료 체크박스만 초기화한다. sand_stack은 완료 처리 시에만 소진되며 주간 경계와 무관하다
    // (docs/ebony_cube_hal_hourglass.typ 참고).
    async collectOperations({ prisma, characterIds }) {
      return [
        prisma.halHourglass.updateMany({
          where: { characterId: { in: characterIds }, isCompleted: true },
          data: { isCompleted: false },
        }),
      ]
    },
  },
]

/**
 * docs/reset_logic.typ의 지연 평가 초기화. GET /api/dashboards 요청마다 호출되며,
 * User.last_visited_at과 현재 시각 사이에 일일(06:00 KST)/주간(수요일 06:00 KST) 경계가
 * 끼어 있었는지 검사해 해당 유저 소유 모든 캐릭터의 상태를 초기화한다
 * (docs/db_schema.typ의 Users "초기화 적용 범위" 참고). 두 경계 모두 지나지 않았으면 아무것도
 * 하지 않고 반환한다 — last_visited_at은 실제로 초기화가 일어났을 때만 갱신한다(문서 그대로).
 * 어떤 데이터가 초기화 대상인지는 위 LAZY_RESET_TARGETS를 참고 — 이 함수는 그 목록을 순회할 뿐
 * 개별 대상의 세부 로직을 알지 못한다.
 */
export async function applyLazyReset(prisma: PrismaClient, userId: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const now = new Date()
  // last_visited_at이 없는(첫 방문) 유저는 항상 두 경계 모두 지난 것으로 간주한다 — 이제 막
  // 만들어진 캐릭터들뿐이라 초기화는 사실상 아무 효과가 없고, last_visited_at만 채워진다.
  const lastVisitedAtMs = user.lastVisitedAt?.getTime() ?? -Infinity

  const dailyCrossed = mostRecentDailyBoundary(now).getTime() > lastVisitedAtMs
  const weeklyCrossed = mostRecentWeeklyBoundary(now).getTime() > lastVisitedAtMs
  if (!dailyCrossed && !weeklyCrossed) return

  const characters = await prisma.character.findMany({ where: { userId }, select: { id: true } })
  const characterIds = characters.map((character) => character.id)

  const operations: Prisma.PrismaPromise<unknown>[] = []

  if (characterIds.length > 0) {
    const ctx: LazyResetContext = {
      prisma,
      characterIds,
      crossedDaysMask: dailyCrossed ? crossedDailyBoundaryDaysMask(lastVisitedAtMs, now) : 0,
      crossedDailyCount: dailyCrossed ? crossedDailyBoundaryCount(lastVisitedAtMs, now) : 0,
      crossedWeeklyCount: weeklyCrossed ? crossedWeeklyBoundaryCount(lastVisitedAtMs, now) : 0,
    }

    for (const target of LAZY_RESET_TARGETS) {
      const crossed = target.boundary === 'daily' ? dailyCrossed : weeklyCrossed
      if (!crossed) continue
      operations.push(...(await target.collectOperations(ctx)))
    }
  }

  operations.push(prisma.user.update({ where: { id: userId }, data: { lastVisitedAt: now } }))

  await prisma.$transaction(operations)
}
