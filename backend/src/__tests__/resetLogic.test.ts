import { describe, expect, it } from 'vitest'

import {
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
