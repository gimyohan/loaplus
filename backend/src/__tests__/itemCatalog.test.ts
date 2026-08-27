import { describe, expect, it } from 'vitest'

import { findItem, resolveItemRewards } from '../lib/itemCatalog.js'

describe('findItem', () => {
  it('itemCatalog.json에 있는 id면 정의를 반환한다', () => {
    expect(findItem('gemstoneTier4')).toEqual({
      id: 'gemstoneTier4',
      name: '4티어 보석',
      categoryKey: 'gemstone',
    })
  })

  it('카탈로그에 없는 id면 null을 반환한다', () => {
    expect(findItem('doesNotExist')).toBeNull()
  })
})

describe('resolveItemRewards', () => {
  it('itemId를 카탈로그에서 찾아 categoryKey/itemName을 채운 RewardEntry로 바꾼다', () => {
    expect(resolveItemRewards([{ itemId: 'gemstoneTier4', amount: 9 }])).toEqual([
      { categoryKey: 'gemstone', itemId: 'gemstoneTier4', itemName: '4티어 보석', amount: 9 },
    ])
  })

  it('amount는 입력값을 그대로 보존한다(계산하지 않음)', () => {
    const [reward] = resolveItemRewards([{ itemId: 'gemstoneTier4', amount: 63 }])
    expect(reward!.amount).toBe(63)
  })

  it('여러 항목을 순서대로 변환한다', () => {
    const result = resolveItemRewards([
      { itemId: 'gemstoneTier4', amount: 1 },
      { itemId: 'gemstoneTier4', amount: 2 },
    ])
    expect(result.map((r) => r.amount)).toEqual([1, 2])
  })

  it('카탈로그에 없는 itemId는 운영 데이터 불일치로 보고 조용히 건너뛴다', () => {
    expect(resolveItemRewards([{ itemId: 'doesNotExist', amount: 100 }])).toEqual([])
  })

  it('빈 입력이면 빈 배열을 반환한다', () => {
    expect(resolveItemRewards([])).toEqual([])
  })
})
