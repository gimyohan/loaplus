import type { StatFields } from '@/lib/statistics'

export type GoldCategoryKey = 'raid' | 'shard' | 'azenaBlessing' | 'paradise' | 'other'
export type GoldBasis = 'gold' | 'boundGold' | 'total'

export interface GoldCategoryDef {
  key: GoldCategoryKey
  label: string
  goldField: keyof StatFields
  boundGoldField: keyof StatFields
  /** index.css --chart-N 변수와 1:1 대응(dataviz 카테고리 팔레트 슬롯, 고정 순서). */
  colorVar: string
}

// docs/statistics.typ "골드 획득 카테고리: [레이드, 편린, 아제나의 축복, 낙원, 기타]"와 동일한 순서로
// 고정한다 — 파이 차트 각도 배치와 팔레트 슬롯 매핑 모두 이 순서를 그대로 따른다.
export const GOLD_CATEGORIES: GoldCategoryDef[] = [
  { key: 'raid', label: '레이드', goldField: 'raidGoldEarned', boundGoldField: 'raidBoundGoldEarned', colorVar: '--chart-1' },
  { key: 'shard', label: '편린', goldField: 'shardGoldEarned', boundGoldField: 'shardBoundGoldEarned', colorVar: '--chart-2' },
  {
    key: 'azenaBlessing',
    label: '아제나의 축복',
    goldField: 'azenaBlessingGoldEarned',
    boundGoldField: 'azenaBlessingBoundGoldEarned',
    colorVar: '--chart-3',
  },
  { key: 'paradise', label: '낙원', goldField: 'paradiseGoldEarned', boundGoldField: 'paradiseBoundGoldEarned', colorVar: '--chart-4' },
  { key: 'other', label: '기타', goldField: 'otherGoldEarned', boundGoldField: 'otherBoundGoldEarned', colorVar: '--chart-5' },
]

export const GOLD_BASIS_OPTIONS: { key: GoldBasis; label: string }[] = [
  { key: 'gold', label: '골드' },
  { key: 'boundGold', label: '귀속 골드' },
  { key: 'total', label: '골드 + 귀속 골드' },
]

export function categoryValue(fields: StatFields, category: GoldCategoryDef, basis: GoldBasis): number {
  if (basis === 'gold') return fields[category.goldField] as number
  if (basis === 'boundGold') return fields[category.boundGoldField] as number
  return (fields[category.goldField] as number) + (fields[category.boundGoldField] as number)
}

export function cssVar(colorVar: string): string {
  return `rgb(var(${colorVar}))`
}
