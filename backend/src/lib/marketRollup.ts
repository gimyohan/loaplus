// 거래소 주간/월간 시세 통계 계산 헬퍼 (docs/market_price.typ "파이프라인 C" 참고). 순수 계산만
// 담당하고 DB/Open API 접근은 하지 않는다 — jobs/marketPriceBatch.ts가 이 함수들로 계산한 값을
// upsert한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** now(실제 UTC 시각) 기준 오늘의 KST 캘린더 날짜를, Market_Item_Daily_Stats.date와 같은 형태
 * (자정 UTC Date)로 반환한다. */
function todayKstDateOnly(now: Date): Date {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()))
}

export interface DailyStatLike {
  avgPrice: number
  tradeCount: number
}

/**
 * 거래량 가중 평균: Σ(avgPrice × tradeCount) / Σ(tradeCount). Σ(tradeCount)가 0이면(그 기간
 * 내내 거래가 한 건도 없음) 0으로 나누기를 피해 그대로 { avgPrice: 0, tradeCount: 0 }을
 * 반환한다 — 단순 평균으로 대체하지 않는다. avgPrice를 NULL이 아니라 0으로 두는 이유는 Open
 * API 자체가 거래 0건인 날 avgPrice를 0으로 내려주는 것과 값을 통일하기 위해서다(사용자 확정,
 * docs/market_price.md "일별 시세 통계" 참고).
 */
export function weightedAverage(rows: DailyStatLike[]): { avgPrice: number; tradeCount: number } {
  const totalTradeCount = rows.reduce((sum, row) => sum + row.tradeCount, 0)
  if (totalTradeCount === 0) {
    return { avgPrice: 0, tradeCount: 0 }
  }
  const weightedSum = rows.reduce((sum, row) => sum + row.avgPrice * row.tradeCount, 0)
  return { avgPrice: weightedSum / totalTradeCount, tradeCount: totalTradeCount }
}

/**
 * date가 속한 수~화 주의 수요일 날짜(자정 UTC Date)를 반환한다. date는 이미
 * Market_Item_Daily_Stats.date와 같은 "KST 캘린더 날짜를 그대로 담은" 형태라고 가정하므로
 * 추가 KST 보정을 하지 않는다(docs/reset_logic.typ류의 06:00 KST 타임스탬프 절단과 달리, 이
 * 값들은 이미 날짜 단위로만 존재한다) — docs/market_price.md "주 경계" 참고.
 */
export function marketWeekStartDate(date: Date): Date {
  const dayOfWeek = date.getUTCDay() // 0=일 ... 6=토
  const daysSinceWednesday = (dayOfWeek - 3 + 7) % 7
  return new Date(date.getTime() - daysSinceWednesday * MS_PER_DAY)
}

/** date가 속한 달의 1일 날짜(자정 UTC Date)를 반환한다. */
export function marketMonthStartDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

/** now(실제 UTC 시각) 기준 KST로 오늘이 수요일이면(= 어제가 화요일이면, 수~화 한 주가 방금
 * 완결됐으면) true. */
export function shouldRollupWeekly(now: Date): boolean {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  return kst.getUTCDay() === 3
}

/** now(실제 UTC 시각) 기준 KST로 오늘이 그 달의 1일이면(= 지난달이 방금 끝났으면) true. */
export function shouldRollupMonthly(now: Date): boolean {
  const kst = new Date(now.getTime() + KST_OFFSET_MS)
  return kst.getUTCDate() === 1
}

/** shouldRollupWeekly(now)가 true인 날 호출한다고 가정 — 방금 완결된 주(지난 수요일~어제)의
 * [시작, 끝] 날짜를 반환한다. */
export function lastCompletedWeekRange(now: Date): { start: Date; end: Date } {
  const today = todayKstDateOnly(now)
  return {
    start: new Date(today.getTime() - 7 * MS_PER_DAY),
    end: new Date(today.getTime() - 1 * MS_PER_DAY),
  }
}

/** shouldRollupMonthly(now)가 true인 날 호출한다고 가정 — 방금 끝난 달의 [시작, 끝] 날짜를
 * 반환한다. */
export function lastCompletedMonthRange(now: Date): { start: Date; end: Date } {
  const today = todayKstDateOnly(now)
  const end = new Date(today.getTime() - 1 * MS_PER_DAY)
  return { start: marketMonthStartDate(end), end }
}
