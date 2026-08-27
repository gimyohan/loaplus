import { describe, expect, it } from 'vitest'

import {
  availableTicketTypes,
  buildTicketClearRewards,
  cycleTicketType,
  ensureValidSelection,
  findTicketTier,
  ticketColumnField,
  ticketCountByType,
  ticketTypeForKurzanTarget,
  TICKET_TIERS,
} from '../lib/ebonyCubeCatalog.js'

describe('findTicketTier', () => {
  it('알려진 등급이면 정의를 반환한다', () => {
    expect(findTicketTier('unlock1')?.label).toBe('제 1 해금')
  })

  it('알 수 없는 등급이면 null을 반환한다', () => {
    expect(findTicketTier('unlock99')).toBeNull()
  })
})

describe('buildTicketClearRewards', () => {
  it('1회 클리어는 등급 기본 보상을 그대로 지급한다', () => {
    const tier = findTicketTier('unlock1')!
    const baseAmount = tier.rewards[0]!.amount
    expect(buildTicketClearRewards(tier, 1)).toEqual([
      { categoryKey: 'gemstone', itemId: 'gemstoneTier4', itemName: '4티어 보석', amount: baseAmount },
    ])
  })

  it('3회 클리어는 기본 보상의 3배를 지급한다', () => {
    const tier = findTicketTier('unlock2')!
    const baseAmount = tier.rewards[0]!.amount
    const [reward] = buildTicketClearRewards(tier, 3)
    expect(reward!.amount).toBe(baseAmount * 3)
  })

  it('등급 4종 모두 카탈로그에 정의돼 있고 각자 다른 보상량을 갖는다', () => {
    const amounts = TICKET_TIERS.map((tier) => tier.rewards[0]!.amount)
    expect(amounts).toHaveLength(4)
    expect(new Set(amounts).size).toBe(4)
  })
})

describe('ticketTypeForKurzanTarget', () => {
  it('쿠르잔 전선 스테이지 이름이면 매핑된 등급을 반환한다', () => {
    expect(ticketTypeForKurzanTarget('아비도스 1 작전')).toBe('unlock1')
    expect(ticketTypeForKurzanTarget('아비도스 3작전')).toBe('unlock2')
    expect(ticketTypeForKurzanTarget('네프타 2 작전')).toBe('unlock4')
  })

  it('카오스 던전 스테이지 이름이면 매핑이 없어 null을 반환한다', () => {
    expect(ticketTypeForKurzanTarget('계몽 1 (볼다이크)')).toBeNull()
  })

  it('혼돈의 균열 스테이지 이름이면 매핑이 없어 null을 반환한다 (이 경우 시련의 모래를 대신 적립)', () => {
    expect(ticketTypeForKurzanTarget('심연의 역류 1')).toBeNull()
  })

  it('알 수 없는 이름이면 null을 반환한다', () => {
    expect(ticketTypeForKurzanTarget('존재하지 않는 목표')).toBeNull()
  })
})

describe('ticketCountByType / ticketColumnField', () => {
  it('EbonyCube 행을 등급별 수량 맵으로 바꾼다', () => {
    expect(
      ticketCountByType({
        ticketCountUnlock1: 1,
        ticketCountUnlock2: 2,
        ticketCountUnlock3: 3,
        ticketCountUnlock4: 4,
      }),
    ).toEqual({ unlock1: 1, unlock2: 2, unlock3: 3, unlock4: 4 })
  })

  it('등급마다 올바른 Prisma 컬럼 이름을 반환한다', () => {
    expect(ticketColumnField('unlock1')).toBe('ticketCountUnlock1')
    expect(ticketColumnField('unlock4')).toBe('ticketCountUnlock4')
  })
})

describe('availableTicketTypes', () => {
  it('수량이 1개 이상인 등급만, unlock1~4 고정 순서로 반환한다', () => {
    expect(availableTicketTypes({ unlock1: 0, unlock2: 5, unlock3: 0, unlock4: 1 })).toEqual(['unlock2', 'unlock4'])
  })

  it('전부 0이면 빈 배열을 반환한다', () => {
    expect(availableTicketTypes({ unlock1: 0, unlock2: 0, unlock3: 0, unlock4: 0 })).toEqual([])
  })
})

describe('cycleTicketType', () => {
  const available: ('unlock1' | 'unlock2' | 'unlock3')[] = ['unlock1', 'unlock2', 'unlock3']

  it('available이 비어있으면 null을 반환한다', () => {
    expect(cycleTicketType([], 'unlock1', 'next')).toBeNull()
  })

  it('현재 선택이 목록에 없으면 next는 첫 번째, prev는 마지막을 반환한다', () => {
    expect(cycleTicketType(available, null, 'next')).toBe('unlock1')
    expect(cycleTicketType(available, null, 'prev')).toBe('unlock3')
  })

  it('중간 항목에서는 정상적으로 앞뒤로 이동한다', () => {
    expect(cycleTicketType(available, 'unlock1', 'next')).toBe('unlock2')
    expect(cycleTicketType(available, 'unlock3', 'prev')).toBe('unlock2')
  })

  it('마지막 항목에서 next를 눌러도 순환하지 않고 그대로 멈춘다', () => {
    expect(cycleTicketType(available, 'unlock3', 'next')).toBe('unlock3')
  })

  it('첫 항목에서 prev를 눌러도 순환하지 않고 그대로 멈춘다', () => {
    expect(cycleTicketType(available, 'unlock1', 'prev')).toBe('unlock1')
  })
})

describe('ensureValidSelection', () => {
  it('현재 선택의 수량이 아직 남아있으면 그대로 유지한다', () => {
    expect(ensureValidSelection({ unlock1: 5, unlock2: 0, unlock3: 0, unlock4: 0 }, 'unlock1', 'unlock1')).toBe(
      'unlock1',
    )
  })

  it('현재 선택이 null이어도 justChanged 등급에 수량이 남아있으면 그쪽을 고른다', () => {
    expect(ensureValidSelection({ unlock1: 0, unlock2: 3, unlock3: 0, unlock4: 0 }, null, 'unlock2')).toBe('unlock2')
  })

  it('현재 선택 수량이 방금 0이 되고 justChanged도 0이면 unlock1~4 순서로 첫 유효 등급을 고른다', () => {
    expect(ensureValidSelection({ unlock1: 0, unlock2: 0, unlock3: 7, unlock4: 2 }, 'unlock2', 'unlock2')).toBe(
      'unlock3',
    )
  })

  it('보유 티켓이 하나도 없으면 null을 반환한다', () => {
    expect(ensureValidSelection({ unlock1: 0, unlock2: 0, unlock3: 0, unlock4: 0 }, 'unlock1', 'unlock1')).toBeNull()
  })
})
