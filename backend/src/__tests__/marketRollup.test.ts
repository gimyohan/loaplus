import { describe, expect, it } from 'vitest'

import {
  lastCompletedMonthRange,
  lastCompletedWeekRange,
  marketMonthStartDate,
  marketWeekStartDate,
  shouldRollupMonthly,
  shouldRollupWeekly,
  weightedAverage,
} from '../lib/marketRollup.js'

// 요일/날짜 기대값은 실제 달력을 손으로 확인해 하드코딩한다(구현과 같은 방식으로 다시 계산하면
// 구현이 틀려도 테스트가 같이 틀려서 통과해버리므로 — docs/testing.typ 원칙과 동일).
// 2026-09-02(수), 2026-09-06(일), 2026-09-01(화), 2026-08-31(월), 2026-08-26(수) — 즉
// 2026-08-26(수)~2026-09-01(화)이 한 주, 2026-09-02(수)~2026-09-08(화)이 그다음 주.

describe('weightedAverage', () => {
  it('정상 케이스: 거래량 가중 평균을 계산한다', () => {
    const result = weightedAverage([
      { avgPrice: 10, tradeCount: 2 },
      { avgPrice: 20, tradeCount: 3 },
    ])
    // (10*2 + 20*3) / (2+3) = 80/5 = 16
    expect(result).toEqual({ avgPrice: 16, tradeCount: 5 })
  })

  it('거래 0건인 날이 섞여 있으면 가중치 0이라 결과에 영향을 주지 않는다', () => {
    const result = weightedAverage([
      { avgPrice: 999, tradeCount: 0 },
      { avgPrice: 10, tradeCount: 4 },
    ])
    expect(result).toEqual({ avgPrice: 10, tradeCount: 4 })
  })

  it('전부 거래 0건이면 0으로 나누기 대신 {avgPrice:0, tradeCount:0}을 반환한다', () => {
    const result = weightedAverage([
      { avgPrice: 0, tradeCount: 0 },
      { avgPrice: 0, tradeCount: 0 },
    ])
    expect(result).toEqual({ avgPrice: 0, tradeCount: 0 })
  })

  it('빈 배열이어도 NaN이 아니라 {avgPrice:0, tradeCount:0}을 반환한다', () => {
    expect(weightedAverage([])).toEqual({ avgPrice: 0, tradeCount: 0 })
  })
})

describe('marketWeekStartDate', () => {
  it('수요일 자신은 그대로 그 날짜를 반환한다', () => {
    expect(marketWeekStartDate(new Date('2026-09-02T00:00:00.000Z'))).toEqual(
      new Date('2026-09-02T00:00:00.000Z'),
    )
  })

  it('같은 주의 일요일은 그 주 수요일로 매핑된다', () => {
    expect(marketWeekStartDate(new Date('2026-09-06T00:00:00.000Z'))).toEqual(
      new Date('2026-09-02T00:00:00.000Z'),
    )
  })

  it('화요일은 그 전 수요일(전주)로 매핑된다', () => {
    expect(marketWeekStartDate(new Date('2026-09-01T00:00:00.000Z'))).toEqual(
      new Date('2026-08-26T00:00:00.000Z'),
    )
  })

  it('월요일도 그 전 수요일(전주)로 매핑된다', () => {
    expect(marketWeekStartDate(new Date('2026-08-31T00:00:00.000Z'))).toEqual(
      new Date('2026-08-26T00:00:00.000Z'),
    )
  })
})

describe('marketMonthStartDate', () => {
  it('월중 날짜는 그 달 1일로 매핑된다', () => {
    expect(marketMonthStartDate(new Date('2026-09-06T00:00:00.000Z'))).toEqual(
      new Date('2026-09-01T00:00:00.000Z'),
    )
  })

  it('월말 날짜도 그 달 1일로 매핑된다', () => {
    expect(marketMonthStartDate(new Date('2026-09-30T00:00:00.000Z'))).toEqual(
      new Date('2026-09-01T00:00:00.000Z'),
    )
  })

  it('1일 자신은 그대로 반환한다', () => {
    expect(marketMonthStartDate(new Date('2026-10-01T00:00:00.000Z'))).toEqual(
      new Date('2026-10-01T00:00:00.000Z'),
    )
  })
})

describe('shouldRollupWeekly', () => {
  it('KST로 오늘이 수요일이면 true', () => {
    // 2026-09-01T20:00:00Z + 9h = 2026-09-02T05:00:00 KST(수)
    expect(shouldRollupWeekly(new Date('2026-09-01T20:00:00.000Z'))).toBe(true)
  })

  it('KST로 오늘이 수요일이 아니면 false', () => {
    // 2026-09-02T20:00:00Z + 9h = 2026-09-03T05:00:00 KST(목)
    expect(shouldRollupWeekly(new Date('2026-09-02T20:00:00.000Z'))).toBe(false)
  })
})

describe('shouldRollupMonthly', () => {
  it('KST로 오늘이 1일이면 true', () => {
    // 2026-08-31T20:00:00Z + 9h = 2026-09-01T05:00:00 KST(1일)
    expect(shouldRollupMonthly(new Date('2026-08-31T20:00:00.000Z'))).toBe(true)
  })

  it('KST로 오늘이 1일이 아니면 false', () => {
    // 2026-09-01T20:00:00Z + 9h = 2026-09-02T05:00:00 KST(2일)
    expect(shouldRollupMonthly(new Date('2026-09-01T20:00:00.000Z'))).toBe(false)
  })
})

describe('lastCompletedWeekRange', () => {
  it('KST 수요일에 호출하면 방금 끝난 주(전전 수요일~어제)를 반환한다', () => {
    // now = KST 2026-09-02(수) 05:00 -> 방금 끝난 주는 2026-08-26(수)~2026-09-01(화)
    const { start, end } = lastCompletedWeekRange(new Date('2026-09-01T20:00:00.000Z'))
    expect(start).toEqual(new Date('2026-08-26T00:00:00.000Z'))
    expect(end).toEqual(new Date('2026-09-01T00:00:00.000Z'))
  })
})

describe('lastCompletedMonthRange', () => {
  it('KST 1일에 호출하면 방금 끝난 달의 범위를 반환한다', () => {
    // now = KST 2026-09-01(1일) 05:00 -> 방금 끝난 달은 2026-08-01~2026-08-31
    const { start, end } = lastCompletedMonthRange(new Date('2026-08-31T20:00:00.000Z'))
    expect(start).toEqual(new Date('2026-08-01T00:00:00.000Z'))
    expect(end).toEqual(new Date('2026-08-31T00:00:00.000Z'))
  })
})
