import { describe, expect, it } from 'vitest'

import { AZENA_BLESSING_REWARD_CATALOG, findRewardCatalogItem, SHARD_REWARD_CATALOG } from '../lib/rewardCatalog.js'

describe('findRewardCatalogItem', () => {
  it('이름이 곧 수량인 카테고리(gold)는 itemCatalog에 저장된 amount를 그대로 돌려준다', () => {
    expect(findRewardCatalogItem(SHARD_REWARD_CATALOG, 'gold-bar-10000')).toEqual({
      categoryKey: 'gold',
      itemId: 'gold-bar-10000',
      itemName: '10,000골드',
      amount: 10000,
    })
  })

  it('개수를 세는 카테고리(cardPack 등)는 amount가 1이다', () => {
    expect(findRewardCatalogItem(SHARD_REWARD_CATALOG, 'exp-card-pack')).toEqual({
      categoryKey: 'expCardPack',
      itemId: 'exp-card-pack',
      itemName: '경험치 카드 팩',
      amount: 1,
    })
  })

  it('아제나 축복 카탈로그는 귀속 골드(boundGold)를 쓴다 — 편린의 gold와는 다른 재화', () => {
    expect(findRewardCatalogItem(AZENA_BLESSING_REWARD_CATALOG, 'azena-gold-bar-10000')).toEqual({
      categoryKey: 'boundGold',
      itemId: 'azena-gold-bar-10000',
      itemName: '10,000골드',
      amount: 10000,
    })
  })

  it('카탈로그에 없는 itemId면 null을 반환한다', () => {
    expect(findRewardCatalogItem(SHARD_REWARD_CATALOG, 'does-not-exist')).toBeNull()
  })
})
