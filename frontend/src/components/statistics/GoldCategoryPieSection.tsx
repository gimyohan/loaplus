import { useMemo, useState } from 'react'

import { CharacterDropdown } from '@/components/statistics/CharacterDropdown'
import { PieChart } from '@/components/statistics/charts/PieChart'
import type { CharacterStatistics, StatFields } from '@/lib/statistics'
import { categoryValue, cssVar, GOLD_BASIS_OPTIONS, GOLD_CATEGORIES, type GoldBasis } from '@/lib/statisticsCategories'
import { cn } from '@/lib/utils'

export interface GoldCategoryPieSectionProps {
  characters: CharacterStatistics[]
}

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function sumFields(characters: CharacterStatistics[]): StatFields {
  return characters.reduce<StatFields>(
    (acc, character) => {
      for (const key of Object.keys(acc) as (keyof StatFields)[]) {
        acc[key] += character[key]
      }
      return acc
    },
    {
      totalGoldEarned: 0,
      totalBoundGoldEarned: 0,
      raidGoldEarned: 0,
      raidBoundGoldEarned: 0,
      shardGoldEarned: 0,
      shardBoundGoldEarned: 0,
      azenaBlessingGoldEarned: 0,
      azenaBlessingBoundGoldEarned: 0,
      paradiseGoldEarned: 0,
      paradiseBoundGoldEarned: 0,
      otherGoldEarned: 0,
      otherBoundGoldEarned: 0,
      guardianHarvestCount: 0,
      kurzanHarvestCount: 0,
      shardRewardCount: 0,
      guardianShardRewardCount: 0,
      kurzanShardRewardCount: 0,
      azenaBlessingRewardCount: 0,
      guardianAzenaBlessingRewardCount: 0,
      kurzanAzenaBlessingRewardCount: 0,
      cubeGemEarned: 0,
    },
  )
}

function toSlices(fields: StatFields, basis: GoldBasis) {
  return GOLD_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    value: categoryValue(fields, category, basis),
    color: cssVar(category.colorVar),
  }))
}

/** 컨텐츠별 골드 획득량 — 왼쪽은 모든 캐릭터 합, 오른쪽은 드롭다운으로 고른 캐릭터 하나. */
export function GoldCategoryPieSection({ characters }: GoldCategoryPieSectionProps) {
  const [basis, setBasis] = useState<GoldBasis>('total')
  const [selectedId, setSelectedId] = useState<string>(characters[0]?.characterId ?? '')

  const allFields = useMemo(() => sumFields(characters), [characters])
  const selectedCharacter = characters.find((c) => c.characterId === selectedId) ?? characters[0]

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">컨텐츠별 골드 획득량</h3>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {GOLD_BASIS_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setBasis(option.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                basis === option.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">모든 캐릭터</span>
          <PieChart slices={toSlices(allFields, basis)} formatValue={formatNumber} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <CharacterDropdown
            characters={characters.map((c) => ({ characterId: c.characterId, characterName: c.characterName }))}
            selectedId={selectedCharacter?.characterId ?? null}
            onChange={(id) => id && setSelectedId(id)}
            allowAll={false}
          />
          <PieChart slices={selectedCharacter ? toSlices(selectedCharacter, basis) : []} formatValue={formatNumber} />
        </div>
      </div>
    </section>
  )
}
