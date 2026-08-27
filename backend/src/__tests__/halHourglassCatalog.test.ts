import { describe, expect, it } from 'vitest'

import {
  buildHalHourglassCompleteRewards,
  findHalHourglassLevel,
  HAL_HOURGLASS_LEVELS,
  pickHalHourglassLevel,
} from '../lib/halHourglassCatalog.js'

describe('pickHalHourglassLevel', () => {
  it('아이템 레벨이 모든 구간 최소치보다 낮으면 가장 낮은 레벨을 반환한다', () => {
    expect(pickHalHourglassLevel(0)).toBe('제 1 단계')
  })

  it('정확히 구간 경계 레벨이면 그 레벨을 반환한다', () => {
    expect(pickHalHourglassLevel(1750)).toBe('제 2 단계')
  })

  it('경계보다 1 낮으면 그 아래 단계를 반환한다', () => {
    expect(pickHalHourglassLevel(1749)).toBe('제 1 단계')
  })

  it('모든 구간보다 높으면 가장 높은 레벨을 반환한다', () => {
    expect(pickHalHourglassLevel(9999)).toBe('제 3 단계')
  })
})

describe('findHalHourglassLevel', () => {
  it('알려진 레벨 이름이면 정의를 반환한다', () => {
    expect(findHalHourglassLevel('제 1 단계')?.minItemLevel).toBe(1730)
  })

  it('알 수 없는 이름이면 null을 반환한다', () => {
    expect(findHalHourglassLevel('존재하지 않는 레벨')).toBeNull()
  })
})

describe('buildHalHourglassCompleteRewards', () => {
  const level1 = findHalHourglassLevel('제 1 단계')!
  const baseAmount = level1.baseRewards[0]!.amount

  it('스택이 0이어도 최소 1배(기본 보상 그대로)를 지급한다', () => {
    expect(buildHalHourglassCompleteRewards(level1, 0)).toEqual([
      { categoryKey: 'gemstone', itemId: 'gemstoneTier4', itemName: '4티어 보석', amount: baseAmount },
    ])
  })

  it('보상 배율은 스택 수가 아니라 (스택+1)배다', () => {
    const [reward] = buildHalHourglassCompleteRewards(level1, 4)
    expect(reward!.amount).toBe(baseAmount * 5)
  })

  it('레벨 3종 모두 카탈로그에 정의돼 있고 각자 다른 보상량을 갖는다', () => {
    const amounts = HAL_HOURGLASS_LEVELS.map((level) => level.baseRewards[0]!.amount)
    expect(amounts).toHaveLength(3)
    expect(new Set(amounts).size).toBe(3)
  })
})
