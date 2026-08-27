import { describe, expect, it } from 'vitest'

import { isChaosRiftKurzanTarget, pickHighestEligibleTarget } from '../lib/contentTargets.js'

describe('pickHighestEligibleTarget', () => {
  const options = [
    { name: 'low', minItemLevel: 100 },
    { name: 'mid', minItemLevel: 200 },
    { name: 'high', minItemLevel: 300 },
  ]

  it('입장 가능한 목표가 없으면(레벨이 최소 요구치 미만) 가장 낮은 목표를 반환한다', () => {
    expect(pickHighestEligibleTarget(options, 0)).toBe('low')
  })

  it('여러 목표가 입장 가능하면 그중 가장 높은 것을 반환한다', () => {
    expect(pickHighestEligibleTarget(options, 250)).toBe('mid')
  })

  it('정확히 최소 요구치와 같으면 그 목표도 입장 가능한 것으로 친다', () => {
    expect(pickHighestEligibleTarget(options, 300)).toBe('high')
  })

  it('입력 순서가 뒤섞여 있어도 minItemLevel 기준으로 정렬해 판단한다', () => {
    const shuffled = [options[2]!, options[0]!, options[1]!]
    expect(pickHighestEligibleTarget(shuffled, 250)).toBe('mid')
  })
})

describe('isChaosRiftKurzanTarget', () => {
  it('혼돈의 균열 스테이지 이름이면 true를 반환한다', () => {
    expect(isChaosRiftKurzanTarget('심연의 역류 1')).toBe(true)
    expect(isChaosRiftKurzanTarget('심연의 역류 3')).toBe(true)
  })

  it('쿠르잔 전선 스테이지 이름이면 false를 반환한다', () => {
    expect(isChaosRiftKurzanTarget('아비도스 2작전')).toBe(false)
  })

  it('카오스 던전 스테이지 이름이면 false를 반환한다', () => {
    expect(isChaosRiftKurzanTarget('계몽 1 (볼다이크)')).toBe(false)
  })

  it('알 수 없는 이름이면 false를 반환한다', () => {
    expect(isChaosRiftKurzanTarget('존재하지 않는 목표')).toBe(false)
  })
})
