import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CharacterStatistics } from '@/lib/statistics'
import { cn } from '@/lib/utils'

export interface StatisticsTableProps {
  characters: CharacterStatistics[]
}

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatNumber(value: number) {
  return numberFormatter.format(value)
}

type SortableColumn = 'characterName' | 'totalGoldEarned' | 'totalBoundGoldEarned' | 'shardRewardCount' | 'azenaBlessingRewardCount'

const COLUMNS: { key: SortableColumn; label: string }[] = [
  { key: 'characterName', label: '캐릭터' },
  { key: 'totalGoldEarned', label: '총 골드 획득량' },
  { key: 'totalBoundGoldEarned', label: '귀속 골드 획득량' },
  { key: 'shardRewardCount', label: '편린 획득량' },
  { key: 'azenaBlessingRewardCount', label: '아제나의 축복 획득량' },
]

/** 캐릭터별 전체 기간 누적 통계 테이블 — 헤더 클릭으로 컬럼별 정렬. */
export function StatisticsTable({ characters }: StatisticsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortableColumn>('totalGoldEarned')
  const [sortDesc, setSortDesc] = useState(true)

  const sorted = useMemo(() => {
    const rows = [...characters]
    rows.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      const compared = typeof aValue === 'string' ? aValue.localeCompare(bValue as string) : (aValue as number) - (bValue as number)
      return sortDesc ? -compared : compared
    })
    return rows
  }, [characters, sortColumn, sortDesc])

  const handleSort = (column: SortableColumn) => {
    if (column === sortColumn) {
      setSortDesc((prev) => !prev)
    } else {
      setSortColumn(column)
      setSortDesc(true)
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            {COLUMNS.map((column) => (
              <th key={column.key} className={cn('px-4 py-3 font-medium', column.key !== 'characterName' && 'text-right')}>
                <button
                  type="button"
                  onClick={() => handleSort(column.key)}
                  className={cn(
                    'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                    column.key !== 'characterName' && 'flex-row-reverse',
                  )}
                >
                  {column.label}
                  {sortColumn === column.key ? (
                    sortDesc ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((character) => (
            <tr key={character.characterId} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
              <td className="px-4 py-3 font-medium text-foreground">{character.characterName}</td>
              <td className="px-4 py-3 text-right font-mono text-secondary">{formatNumber(character.totalGoldEarned)}</td>
              <td className="px-4 py-3 text-right font-mono text-secondary">{formatNumber(character.totalBoundGoldEarned)}</td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatNumber(character.shardRewardCount)}</td>
              <td className="px-4 py-3 text-right font-mono text-muted-foreground">{formatNumber(character.azenaBlessingRewardCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
