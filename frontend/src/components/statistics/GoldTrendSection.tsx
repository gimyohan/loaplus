import { useEffect, useMemo } from 'react'

import type { CharacterOption } from '@/components/statistics/CharacterDropdown'
import { ALL_CHARACTERS_ID, CharacterMultiSelect } from '@/components/statistics/CharacterMultiSelect'
import { LineChart, type LineChartPoint, type LineChartSeries } from '@/components/statistics/charts/LineChart'
import { useLocalStorageState } from '@/hooks/useLocalStorageState'
import type { WeeklyStatRow } from '@/lib/statistics'
import { cssVar, GOLD_BASIS_OPTIONS, type GoldBasis } from '@/lib/statisticsCategories'
import { cn } from '@/lib/utils'

export interface GoldTrendSectionProps {
  characters: CharacterOption[]
  allWeekly: WeeklyStatRow[]
}

// 팔레트가 5슬롯(index.css --chart-1~5)뿐이라 6번째 캐릭터부터는 색이 되풀이된다.
const CHART_COLOR_SLOTS = 5

// 다른 탭에 갔다 돌아와도(App.tsx가 대시보드 외 탭은 언마운트한다) 선택이 유지되도록 localStorage에
// 저장한다(사용자 확정).
const BASIS_STORAGE_KEY = 'loaplus:statistics:goldTrend:basis'
const SELECTED_IDS_STORAGE_KEY = 'loaplus:statistics:goldTrend:selectedIds'

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatNumber(value: number) {
  return numberFormatter.format(value)
}

/** "2026-08-14" → "8/14" */
function formatWeekLabel(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

function basisValue(row: { totalGoldEarned: number; totalBoundGoldEarned: number }, basis: GoldBasis): number {
  if (basis === 'gold') return row.totalGoldEarned
  if (basis === 'boundGold') return row.totalBoundGoldEarned
  return row.totalGoldEarned + row.totalBoundGoldEarned
}

/** 여러 캐릭터의 같은 주 행을 weekStartDate 기준으로 합산한다("모든 캐릭터" 항목용). */
function sumByWeek(rows: WeeklyStatRow[]): { weekStartDate: string; totalGoldEarned: number; totalBoundGoldEarned: number }[] {
  const map = new Map<string, { weekStartDate: string; totalGoldEarned: number; totalBoundGoldEarned: number }>()
  for (const row of rows) {
    const existing = map.get(row.weekStartDate)
    if (existing) {
      existing.totalGoldEarned += row.totalGoldEarned
      existing.totalBoundGoldEarned += row.totalBoundGoldEarned
    } else {
      map.set(row.weekStartDate, {
        weekStartDate: row.weekStartDate,
        totalGoldEarned: row.totalGoldEarned,
        totalBoundGoldEarned: row.totalBoundGoldEarned,
      })
    }
  }
  return [...map.values()]
}

/**
 * 주차별 캐릭터 골드 획득 추이 — 골드/귀속골드/골드+귀속골드 중 하나를 라디오로 고르고("what"),
 * "모든 캐릭터"를 포함해 캐릭터를 여러 개 동시에 선택해("who") 그래프에 캐릭터별 선 하나씩
 * 겹쳐 비교한다. allWeekly가 이미 내 모든 캐릭터의 주간 행을 characterId 태그와 함께 담고
 * 있으므로(StatisticsView가 한 번에 조회), 캐릭터를 추가로 선택해도 서버에 다시 묻지 않고
 * 이 배열을 characterId로 걸러 쓴다.
 */
export function GoldTrendSection({ characters, allWeekly }: GoldTrendSectionProps) {
  const [basis, setBasis] = useLocalStorageState<GoldBasis>(BASIS_STORAGE_KEY, 'total')
  // 초기 선택값은 "모든 캐릭터" 하나만(사용자 확정).
  const [selectedIds, setSelectedIds] = useLocalStorageState<string[]>(SELECTED_IDS_STORAGE_KEY, [ALL_CHARACTERS_ID])

  // 캐시된 선택 중 이미 삭제된 캐릭터가 있으면 걸러낸다 — 그대로 두면 범례에 캐릭터명 대신
  // characterId(uuid)가 그대로 노출된다(아래 label 계산의 `?? id` 대체값 참고).
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set([ALL_CHARACTERS_ID, ...characters.map((c) => c.characterId)])
      const filtered = prev.filter((id) => validIds.has(id))
      return filtered.length > 0 ? filtered : [ALL_CHARACTERS_ID]
    })
  }, [characters, setSelectedIds])

  const rowsByCharacter = useMemo(() => {
    const map = new Map<string, WeeklyStatRow[]>()
    for (const row of allWeekly) {
      if (!map.has(row.characterId)) map.set(row.characterId, [])
      map.get(row.characterId)!.push(row)
    }
    return map
  }, [allWeekly])

  const allCharactersRows = useMemo(() => sumByWeek(allWeekly), [allWeekly])

  const { series, points } = useMemo(() => {
    const resolved = selectedIds.map((id, index) => {
      const isAll = id === ALL_CHARACTERS_ID
      return {
        key: id,
        label: isAll ? '모든 캐릭터' : (characters.find((c) => c.characterId === id)?.characterName ?? id),
        color: cssVar(`--chart-${(index % CHART_COLOR_SLOTS) + 1}`),
        rows: isAll ? allCharactersRows : (rowsByCharacter.get(id) ?? []),
      }
    })

    const weekSet = new Set<string>()
    resolved.forEach((r) => r.rows.forEach((row) => weekSet.add(row.weekStartDate)))
    const weeks = [...weekSet].sort()

    const series: LineChartSeries[] = resolved.map((r) => ({ key: r.key, label: r.label, color: r.color }))
    const points: LineChartPoint[] = weeks.map((week) => ({
      label: formatWeekLabel(week),
      values: Object.fromEntries(
        resolved.map((r) => {
          const row = r.rows.find((candidate) => candidate.weekStartDate === week)
          return [r.key, row ? basisValue(row, basis) : 0]
        }),
      ),
    }))

    return { series, points }
  }, [selectedIds, characters, rowsByCharacter, allCharactersRows, basis])

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">주차별 골드 획득 추이</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="재화 종류" className="flex items-center gap-1 rounded-lg border border-border p-1">
            {GOLD_BASIS_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={basis === option.key}
                onClick={() => setBasis(option.key)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  basis === option.key
                    ? 'bg-primary-strong text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <CharacterMultiSelect characters={characters} selectedIds={selectedIds} onChange={setSelectedIds} />
        </div>
      </div>
      <LineChart series={series} points={points} formatValue={formatNumber} />
    </section>
  )
}
