import { describe, expect, it } from 'vitest'

import {
  applyHarvestDailyResets,
  crossedDailyBoundaryCount,
  crossedWeeklyBoundaryCount,
  mostRecentDailyBoundary,
  mostRecentWeeklyBoundary,
  retentionCutoffDate,
  weekStartDateKey,
} from '../lib/resetLogic.js'

// 모든 기대값은 "06:00 KST = 전날 21:00 UTC" 관계를 손으로 계산해 하드코딩한다 — 구현과 같은
// 방식(오프셋 이동)으로 기대값을 계산하면 구현이 틀려도 테스트가 같이 틀려서 통과해버리므로,
// 반드시 독립적으로 계산한 결과와 비교한다 (docs/testing.typ "1순위 — 리셋 로직" 참고).

describe('mostRecentDailyBoundary', () => {
  it('정확히 경계 시각(06:00 KST)이면 그 시각 자신을 반환한다', () => {
    // 2026-08-25 06:00:00 KST == 2026-08-24 21:00:00 UTC
    const at = new Date('2026-08-24T21:00:00.000Z')
    expect(mostRecentDailyBoundary(at)).toEqual(new Date('2026-08-24T21:00:00.000Z'))
  })

  it('경계 1분 전이면 하루 전 경계로 되돌아간다', () => {
    // 2026-08-25 05:59:00 KST
    const at = new Date('2026-08-24T20:59:00.000Z')
    expect(mostRecentDailyBoundary(at)).toEqual(new Date('2026-08-23T21:00:00.000Z'))
  })

  it('경계 1분 후이면 당일 경계를 반환한다', () => {
    // 2026-08-25 06:01:00 KST
    const at = new Date('2026-08-24T21:01:00.000Z')
    expect(mostRecentDailyBoundary(at)).toEqual(new Date('2026-08-24T21:00:00.000Z'))
  })
})

describe('crossedDailyBoundaryCount', () => {
  it('운영에서 실제로 누락됐던 사례: 18일 16:25 KST 방문 → 20일 07:22 KST는 경계 2개(19일·20일 06:00)', () => {
    const last = new Date('2026-10-18T07:25:37.000Z').getTime()
    const now = new Date('2026-10-19T22:22:14.000Z')
    expect(crossedDailyBoundaryCount(last, now)).toBe(2)
  })

  it('같은 날 안에서 경계를 한 번만 넘으면 1', () => {
    // 05:00 KST 방문 → 같은 날 07:00 KST
    const last = new Date('2026-10-18T20:00:00.000Z').getTime()
    const now = new Date('2026-10-18T22:00:00.000Z')
    expect(crossedDailyBoundaryCount(last, now)).toBe(1)
  })

  it('첫 방문(last_visited_at 없음)은 1', () => {
    expect(crossedDailyBoundaryCount(-Infinity, new Date('2026-10-19T22:22:14.000Z'))).toBe(1)
  })
})

describe('crossedWeeklyBoundaryCount', () => {
  it('같은 주 안에서 경계를 한 번만 넘으면 1', () => {
    // 2026-10-14(수) 05:00 KST 방문 → 같은 날 07:00 KST (경계 2026-10-13T21:00Z)
    const last = new Date('2026-10-13T20:00:00.000Z').getTime()
    const now = new Date('2026-10-13T22:00:00.000Z')
    expect(crossedWeeklyBoundaryCount(last, now)).toBe(1)
  })

  it('3주 비웠다 접속하면 3', () => {
    // 2026-09-23(수) 07:00 KST 방문 → 2026-10-14(수) 07:00 KST: 경계 9/30, 10/7, 10/14
    const last = new Date('2026-09-22T22:00:00.000Z').getTime()
    const now = new Date('2026-10-13T22:00:00.000Z')
    expect(crossedWeeklyBoundaryCount(last, now)).toBe(3)
  })

  it('첫 방문은 1', () => {
    expect(crossedWeeklyBoundaryCount(-Infinity, new Date('2026-10-13T22:00:00.000Z'))).toBe(1)
  })
})

describe('applyHarvestDailyResets', () => {
  const base = { restGaugeMax: 100 }

  it('경계 1개 — 수확한 날이면 게이지는 그대로(플래그만 끔)', () => {
    expect(applyHarvestDailyResets({ ...base, isHarvested: true, restGauge: 0 }, 1)).toEqual({ restGauge: 0 })
  })

  it('경계 1개 — 쉰 날이면 10% 충전', () => {
    expect(applyHarvestDailyResets({ ...base, isHarvested: false, restGauge: 0 }, 1)).toEqual({ restGauge: 10 })
  })

  it('경계 2개 — 수확 다음 날 쉬었으면 첫 경계는 플래그만, 둘째 경계에서 10% 충전(운영 누락 사례)', () => {
    expect(applyHarvestDailyResets({ ...base, isHarvested: true, restGauge: 0 }, 2)).toEqual({ restGauge: 10 })
  })

  it('경계 3개 — 안 한 채로 비웠으면 3일치 30% 충전', () => {
    expect(applyHarvestDailyResets({ ...base, isHarvested: false, restGauge: 0 }, 3)).toEqual({ restGauge: 30 })
  })

  it('최대치를 넘지 않는다 — 충전량이 남은 공간보다 커도 상한에서 멈춘다', () => {
    expect(applyHarvestDailyResets({ ...base, isHarvested: false, restGauge: 95 }, 5)).toEqual({ restGauge: 100 })
    expect(applyHarvestDailyResets({ ...base, isHarvested: true, restGauge: 85 }, 10)).toEqual({ restGauge: 100 })
  })

  it('이미 상한이면 그대로, 충전 경계가 없으면(수확 후 경계 1개) 기존 값을 건드리지 않는다', () => {
    expect(applyHarvestDailyResets({ ...base, isHarvested: false, restGauge: 100 }, 3)).toEqual({ restGauge: 100 })
    expect(applyHarvestDailyResets({ ...base, isHarvested: true, restGauge: 120 }, 1)).toEqual({ restGauge: 120 })
  })
})

describe('mostRecentWeeklyBoundary', () => {
  it('오늘이 수요일이고 06:00을 지났으면 오늘의 일일 경계와 같다', () => {
    // 2024-01-03(수) 10:00 KST -> 2024-01-02T21:00:00Z가 그날 06:00 KST의 실제 시각
    const at = new Date('2024-01-03T01:00:00.000Z')
    expect(mostRecentWeeklyBoundary(at)).toEqual(new Date('2024-01-02T21:00:00.000Z'))
  })

  it('금요일이면 이번 주 수요일 06:00 KST로 되돌아간다', () => {
    // 2024-01-05(금) 10:00 KST -> 이번 주 수요일(2024-01-03) 06:00 KST
    const at = new Date('2024-01-05T01:00:00.000Z')
    expect(mostRecentWeeklyBoundary(at)).toEqual(new Date('2024-01-02T21:00:00.000Z'))
  })

  it('수요일 06:00 KST 이전이면 지난주 수요일로 되돌아간다 (연도 경계 포함)', () => {
    // 2024-01-03(수) 05:00 KST -> 아직 이번 주 수요일 경계 전이라 지난주 수요일(2023-12-27)로
    const at = new Date('2024-01-02T20:00:00.000Z')
    expect(mostRecentWeeklyBoundary(at)).toEqual(new Date('2023-12-26T21:00:00.000Z'))
  })
})

describe('weekStartDateKey', () => {
  it('주간 경계가 속한 KST 날짜의 자정 UTC를 반환한다', () => {
    // 위 "금요일" 케이스와 동일한 입력 -> 주간 경계는 2024-01-03(수) KST
    const at = new Date('2024-01-05T01:00:00.000Z')
    expect(weekStartDateKey(at)).toEqual(new Date('2024-01-03T00:00:00.000Z'))
  })

  it('연도 경계를 넘어가는 경우도 올바른 날짜를 반환한다', () => {
    // 위 "연도 경계" 케이스와 동일한 입력 -> 주간 경계는 2023-12-27(수) KST
    const at = new Date('2024-01-02T20:00:00.000Z')
    expect(weekStartDateKey(at)).toEqual(new Date('2023-12-27T00:00:00.000Z'))
  })
})

describe('retentionCutoffDate', () => {
  it('KST 기준 90일 전 자정(UTC)을 반환한다 (같은 해)', () => {
    const now = new Date('2026-08-24T00:00:00.000Z')
    expect(retentionCutoffDate(now)).toEqual(new Date('2026-05-26T00:00:00.000Z'))
  })

  it('연도를 넘어가는 90일 전 계산도 올바르다', () => {
    const now = new Date('2026-01-15T00:00:00.000Z')
    expect(retentionCutoffDate(now)).toEqual(new Date('2025-10-17T00:00:00.000Z'))
  })
})
