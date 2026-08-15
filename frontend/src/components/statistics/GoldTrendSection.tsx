import { useEffect, useMemo, useState } from 'react'

import { CharacterDropdown, type CharacterOption } from '@/components/statistics/CharacterDropdown'
import { LineChart, type LineChartPoint, type LineChartSeries } from '@/components/statistics/charts/LineChart'
import { fetchCharacterWeeklyStatistics, type CharacterWeeklyStatRow, type WeeklyStatRow } from '@/lib/statistics'
import { cssVar } from '@/lib/statisticsCategories'

export interface GoldTrendSectionProps {
  characters: CharacterOption[]
  allWeekly: WeeklyStatRow[]
}

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatNumber(value: number) {
  return numberFormatter.format(value)
}

/** "2026-08-14" → "8/14" */
function formatWeekLabel(dateStr: string) {
  const [, month, day] = dateStr.split('-')
  return `${Number(month)}/${Number(day)}`
}

const SERIES: LineChartSeries[] = [
  { key: 'gold', label: '골드', color: cssVar('--chart-1') },
  { key: 'boundGold', label: '귀속 골드', color: cssVar('--chart-2') },
  { key: 'total', label: '골드 + 귀속 골드', color: cssVar('--chart-3') },
]

function toPoints(rows: { weekStartDate: string; totalGoldEarned: number; totalBoundGoldEarned: number }[]): LineChartPoint[] {
  return rows
    .slice()
    .sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate))
    .map((row) => ({
      label: formatWeekLabel(row.weekStartDate),
      values: {
        gold: row.totalGoldEarned,
        boundGold: row.totalBoundGoldEarned,
        total: row.totalGoldEarned + row.totalBoundGoldEarned,
      },
    }))
}

/** 여러 캐릭터의 같은 주 행을 weekStartDate 기준으로 합산한다("모든 캐릭터" 모드). */
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

/** 주차별 캐릭터 골드 획득 추이 — "모든 캐릭터 합" 또는 드롭다운으로 고른 특정 캐릭터. */
export function GoldTrendSection({ characters, allWeekly }: GoldTrendSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [characterWeeklyCache, setCharacterWeeklyCache] = useState<Record<string, CharacterWeeklyStatRow[]>>({})
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(false)

  // allWeekly가 새로 fetch될 때마다(예: 기타 수입 기록 직후) 캐릭터별 캐시도 같이 비워야, 이미
  // 캐시된 캐릭터를 보고 있어도 방금 기록한 값이 반영된다.
  useEffect(() => {
    setCharacterWeeklyCache({})
  }, [allWeekly])

  useEffect(() => {
    if (selectedId === null || characterWeeklyCache[selectedId]) return
    let cancelled = false
    setIsLoadingCharacter(true)
    fetchCharacterWeeklyStatistics(selectedId)
      .then((rows) => {
        if (cancelled) return
        setCharacterWeeklyCache((prev) => ({ ...prev, [selectedId]: rows }))
      })
      .catch((err) => console.error('캐릭터 주간 통계 조회 실패', err))
      .finally(() => {
        if (!cancelled) setIsLoadingCharacter(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, characterWeeklyCache])

  const points = useMemo(() => {
    if (selectedId === null) return toPoints(sumByWeek(allWeekly))
    return toPoints(characterWeeklyCache[selectedId] ?? [])
  }, [selectedId, allWeekly, characterWeeklyCache])

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">주차별 골드 획득 추이</h3>
        <CharacterDropdown characters={characters} selectedId={selectedId} onChange={setSelectedId} />
      </div>
      {selectedId !== null && isLoadingCharacter && characterWeeklyCache[selectedId] === undefined ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : (
        <LineChart series={SERIES} points={points} formatValue={formatNumber} />
      )}
    </section>
  )
}
