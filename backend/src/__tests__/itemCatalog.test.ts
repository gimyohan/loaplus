import { describe, expect, it } from 'vitest'

import { findItem, resolveItemRewards } from '../lib/itemCatalog.js'

describe('findItem', () => {
  it('itemCatalog.json에 있는 id면 정의를 반환한다', () => {
    expect(findItem('gemstoneTier4')).toEqual({
      id: 'gemstoneTier4',
      name: '4티어 보석',
      categoryKey: 'gemstone',
      imageUrl: 'https://cdn-lostark.game.onstove.com/efui_iconatlas/use/use_12_103.png',
      imageApprox: true,
      value: null,
    })
  })

  it('카탈로그에 없는 id면 null을 반환한다', () => {
    expect(findItem('doesNotExist')).toBeNull()
  })

  it('골드류 번들 아이템은 재귀적으로 재화 아이템(gold 등)을 가리키는 value를 갖는다', () => {
    expect(findItem('gold-bar-stack-300000')?.value).toEqual({ itemId: 'gold', amount: 300000 })
  })

  it('재화 아이템 자신(gold/boundGold/silver)은 value가 없다(자기 자신이 곧 단위)', () => {
    expect(findItem('gold')?.value).toBeNull()
    expect(findItem('boundGold')?.value).toBeNull()
    expect(findItem('silver')?.value).toBeNull()
  })
})

describe('resolveItemRewards', () => {
  it('itemId를 카탈로그에서 찾아 categoryKey/itemName을 채운 RewardEntry로 바꾼다', () => {
    expect(resolveItemRewards([{ itemId: 'gemstoneTier4', amount: 9 }])).toEqual([
      { categoryKey: 'gemstone', itemId: 'gemstoneTier4', itemName: '4티어 보석', amount: 9 },
    ])
  })

  it('value가 없는 아이템은 amount를 그대로 보존한다(계산하지 않음)', () => {
    const [reward] = resolveItemRewards([{ itemId: 'gemstoneTier4', amount: 63 }])
    expect(reward!.amount).toBe(63)
  })

  it('value가 있는 아이템(골드류 번들)은 amount에 value의 배율을 곱해 실제 재화 수량으로 바꾼다', () => {
    expect(resolveItemRewards([{ itemId: 'gold-bar-stack-300000', amount: 1 }])).toEqual([
      { categoryKey: 'gold', itemId: 'gold-bar-stack-300000', itemName: '300,000골드', amount: 300000 },
    ])
  })

  it('value 배율은 amount와 곱해진다(1개가 아니어도 올바르게 계산)', () => {
    const [reward] = resolveItemRewards([{ itemId: 'gold-bar-stack-300000', amount: 2 }])
    expect(reward!.amount).toBe(600000)
  })

  it('itemId/itemName은 value로 치환되지 않고 원본 번들 아이템 것을 그대로 쓴다(아이템별 통계가 번들 단위로 구분해야 함)', () => {
    const [reward] = resolveItemRewards([{ itemId: 'gold-bar-stack-300000', amount: 1 }])
    expect(reward!.itemId).toBe('gold-bar-stack-300000')
    expect(reward!.itemName).toBe('300,000골드')
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
