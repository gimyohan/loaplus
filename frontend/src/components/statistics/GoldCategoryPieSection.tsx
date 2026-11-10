import { useMemo } from 'react'

import { CharacterDropdown, type CharacterOption } from '@/components/statistics/CharacterDropdown'
import { PieChart } from '@/components/statistics/charts/PieChart'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import type { StatFields, WeeklyStatRow } from '@/lib/statistics'
import { categoryValue, cssVar, GOLD_BASIS_OPTIONS, GOLD_CATEGORIES, type GoldBasis } from '@/lib/statisticsCategories'
import { cn } from '@/lib/utils'

// 다른 탭에 갔다 돌아와도(App.tsx가 대시보드 외 탭은 언마운트한다) 선택이 유지되도록 localStorage에
// 저장한다(사용자 확정).
const BASIS_STORAGE_KEY = 'loaplus:statistics:goldCategoryPie:basis'
const SELECTED_ID_STORAGE_KEY = 'loaplus:statistics:goldCategoryPie:selectedCharacterId'

export interface GoldCategoryPieSectionProps {
  characters: CharacterOption[]
  allWeekly: WeeklyStatRow[]
}

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatNumber(value: number) {
  return numberFormatter.format(value)
}

const ZERO_STAT_FIELDS: StatFields = {
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
  gemstoneTier4Earned: 0,
}

function sumFields(rows: StatFields[]): StatFields {
  return rows.reduce<StatFields>((acc, row) => {
    for (const key of Object.keys(acc) as (keyof StatFields)[]) {
      acc[key] += row[key]
    }
    return acc
  }, { ...ZERO_STAT_FIELDS })
}

function toSlices(fields: StatFields, basis: GoldBasis) {
  return GOLD_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    value: categoryValue(fields, category, basis),
    color: cssVar(category.colorVar),
  }))
}

/** "8/20" 형태로 포맷한다. */
function formatShortDate(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

/**
 * 컨텐츠별 골드 획득량 — 왼쪽은 이번 주 모든 캐릭터 합, 오른쪽은 드롭다운으로 고른 캐릭터
 * 하나의 이번 주 값(사용자 확정: 전체 기간 누적이 아니라 이번 주 기준). allWeekly에 있는
 * weekStartDate 중 가장 최근 값을 "이번 주"로 본다 — Character_Statistics_Weekly는 배치가
 * 아니라 행위 발생 시점에 바로 적립되므로(docs/db_schema.typ 참고) 이번 주 행이 하나라도
 * 있으면 그 날짜가 항상 최신값이다. 이번 주에 아직 아무 행위도 없어 행 자체가 없는 캐릭터는
 * 0으로 취급한다.
 */
export function GoldCategoryPieSection({ characters, allWeekly }: GoldCategoryPieSectionProps) {
  const [basis, setBasis] = useLocalStorageState<GoldBasis>(BASIS_STORAGE_KEY, 'total')
  const [selectedId, setSelectedId] = useLocalStorageState<string>(
    SELECTED_ID_STORAGE_KEY,
    characters[0]?.characterId ?? '',
  )

  const latestWeekStartDate = useMemo(
    () => allWeekly.reduce<string | null>((latest, row) => (!latest || row.weekStartDate > latest ? row.weekStartDate : latest), null),
    [allWeekly],
  )
  const thisWeekRows = useMemo(
    () => (latestWeekStartDate ? allWeekly.filter((row) => row.weekStartDate === latestWeekStartDate) : []),
    [allWeekly, latestWeekStartDate],
  )

  const allFields = useMemo(() => sumFields(thisWeekRows), [thisWeekRows])
  const selectedCharacterFields = thisWeekRows.find((row) => row.characterId === selectedId) ?? ZERO_STAT_FIELDS
  const selectedCharacterId = characters.some((c) => c.characterId === selectedId) ? selectedId : (characters[0]?.characterId ?? null)

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold text-foreground">컨텐츠별 골드 획득량</h3>
          <span className="text-xs text-muted-foreground">
            이번 주{latestWeekStartDate ? ` (${formatShortDate(latestWeekStartDate)}~)` : ''} 기준
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {GOLD_BASIS_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setBasis(option.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                basis === option.key ? 'bg-primary-strong text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
            characters={characters}
            selectedId={selectedCharacterId}
            onChange={(id) => id && setSelectedId(id)}
            allowAll={false}
          />
          <PieChart slices={toSlices(selectedCharacterFields, basis)} formatValue={formatNumber} />
        </div>
      </div>
    </section>
  )
}
