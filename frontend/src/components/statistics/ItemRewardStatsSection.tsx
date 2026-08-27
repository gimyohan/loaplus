import { useEffect, useMemo, useState } from 'react'

import type { CharacterOption } from '@/components/statistics/CharacterDropdown'
import type { RewardCategory } from '@/components/widgets/RewardSelectionModal'
import { AZENA_BLESSING_REWARD_CATEGORIES, SHARD_REWARD_CATEGORIES } from '@/lib/rewardCatalog'
import { fetchCharacterItemRewards, type ItemRewardContentType, type ItemRewardStat, type ItemRewardType } from '@/lib/statistics'
import { cn } from '@/lib/utils'

export interface ItemRewardStatsSectionProps {
  characters: CharacterOption[]
  rewardType: ItemRewardType
}

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function buildCategoryLabels(categories: RewardCategory[]): Record<string, string> {
  return Object.fromEntries(categories.map((category) => [category.key, category.label]))
}

// 편린/아제나 축복 두 보상 모두 가디언/쿠르잔이 같은 카탈로그를 공유한다(lib/rewardCatalog.ts,
// RewardSelectionModal도 동일하게 재사용) — categoryKey → 한글 라벨만 뽑아 쓴다.
const CATEGORY_LABELS: Record<ItemRewardType, Record<string, string>> = {
  SHARD: buildCategoryLabels(SHARD_REWARD_CATEGORIES),
  AZENA_BLESSING: buildCategoryLabels(AZENA_BLESSING_REWARD_CATEGORIES),
}

const CONTENT_TYPE_OPTIONS: { key: ItemRewardContentType; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'GUARDIAN', label: '가디언' },
  { key: 'KURZAN', label: '쿠르잔 전선' },
]

/** 여러 캐릭터의 item-rewards 응답을 itemId 기준으로 합치고, 비율은 합산 총량 기준으로 다시 계산한다. */
function mergeAcrossCharacters(perCharacter: ItemRewardStat[][]): ItemRewardStat[] {
  const merged = new Map<string, ItemRewardStat>()
  for (const rows of perCharacter) {
    for (const row of rows) {
      const existing = merged.get(row.itemId)
      if (existing) {
        existing.count += row.count
      } else {
        merged.set(row.itemId, { ...row })
      }
    }
  }
  const totalCount = [...merged.values()].reduce((sum, item) => sum + item.count, 0)
  return [...merged.values()]
    .map((item) => ({ ...item, ratio: totalCount > 0 ? item.count / totalCount : 0 }))
    .sort((a, b) => b.count - a.count)
}

/** 편린/아제나 축복 아이템별 통계 — 모든 캐릭터 합산, 전체/가디언/쿠르잔으로 필터. */
export function ItemRewardStatsSection({ characters, rewardType }: ItemRewardStatsSectionProps) {
  const [contentType, setContentType] = useState<ItemRewardContentType>('ALL')
  const [perCharacterData, setPerCharacterData] = useState<ItemRewardStat[][] | null>(null)

  useEffect(() => {
    if (characters.length === 0) {
      setPerCharacterData([])
      return
    }
    let cancelled = false
    setPerCharacterData(null)
    Promise.all(characters.map((c) => fetchCharacterItemRewards(c.characterId, rewardType, contentType)))
      .then((results) => {
        if (!cancelled) setPerCharacterData(results)
      })
      .catch((err) => console.error('아이템별 통계 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [characters, rewardType, contentType])

  const items = useMemo(() => (perCharacterData ? mergeAcrossCharacters(perCharacterData) : []), [perCharacterData])
  const maxCount = items[0]?.count ?? 0
  const categoryLabels = CATEGORY_LABELS[rewardType]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border p-1">
        {CONTENT_TYPE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setContentType(option.key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              contentType === option.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {perCharacterData === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">아직 획득한 아이템이 없습니다</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">순위</th>
                <th className="px-4 py-3 font-medium">아이템</th>
                <th className="px-4 py-3 text-right font-medium">수량</th>
                <th className="px-4 py-3 text-right font-medium">비율</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.itemId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{item.itemName}</span>
                      <span className="text-xs text-muted-foreground">{categoryLabels[item.categoryKey] ?? item.categoryKey}</span>
                      <div className="h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-secondary"
                          style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{formatNumber(item.count)}</td>
                  <td className="px-4 py-3 text-right font-mono text-muted-foreground">{(item.ratio * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
