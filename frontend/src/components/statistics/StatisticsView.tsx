import { BarChart3, PlusCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { ComingSoonView } from '@/components/layout/ComingSoonView'
import { GoldCategoryPieSection } from '@/components/statistics/GoldCategoryPieSection'
import { GoldTrendSection } from '@/components/statistics/GoldTrendSection'
import { ItemRewardStatsSection } from '@/components/statistics/ItemRewardStatsSection'
import { OtherIncomeModal } from '@/components/statistics/OtherIncomeModal'
import { StatisticsTable } from '@/components/statistics/StatisticsTable'
import { fetchAllWeeklyStatistics, fetchCharacterStatistics, type CharacterStatistics, type WeeklyStatRow } from '@/lib/statistics'
import { cn } from '@/lib/utils'

type StatisticsTab = 'main' | 'table' | 'shard' | 'azenaBlessing'

const TABS: { key: StatisticsTab; label: string }[] = [
  { key: 'main', label: '메인' },
  { key: 'table', label: '통계 테이블' },
  { key: 'shard', label: '편린 통계' },
  { key: 'azenaBlessing', label: '아제나의 축복 통계' },
]

/**
 * 통계 탭. Character_Statistics/Character_Statistics_Weekly/Character_Item_Reward_Stats를
 * 읽어서 그린다(docs/statistics.typ, docs/api.typ 통계 섹션 참고). 서버는 캐릭터 단위로만
 * 응답하므로 "모든 캐릭터 합" 관점은 이 화면이 직접 합산한다.
 */
export function StatisticsView() {
  const [characters, setCharacters] = useState<CharacterStatistics[] | null>(null)
  const [allWeekly, setAllWeekly] = useState<WeeklyStatRow[] | null>(null)
  const [activeTab, setActiveTab] = useState<StatisticsTab>('main')
  const [isOtherIncomeOpen, setIsOtherIncomeOpen] = useState(false)

  const refresh = useCallback(() => {
    Promise.all([fetchCharacterStatistics(), fetchAllWeeklyStatistics()])
      .then(([characterData, weeklyData]) => {
        setCharacters(characterData)
        setAllWeekly(weeklyData)
      })
      .catch((err) => console.error('통계 조회 실패', err))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (characters === null || allWeekly === null) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>
  }

  if (characters.length === 0) {
    return (
      <ComingSoonView
        icon={BarChart3}
        title="통계가 없습니다"
        description="캐릭터를 등록하고 숙제를 진행하면 여기에 캐릭터별 통계가 표시됩니다."
      />
    )
  }

  const characterOptions = characters.map((c) => ({ characterId: c.characterId, characterName: c.characterName }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsOtherIncomeOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <PlusCircle className="h-4 w-4 text-secondary" />
          기타 수입 기록
        </button>
      </div>

      {activeTab === 'main' && (
        <div className="flex flex-col gap-6">
          <GoldTrendSection characters={characterOptions} allWeekly={allWeekly} />
          <GoldCategoryPieSection characters={characters} />
        </div>
      )}
      {activeTab === 'table' && <StatisticsTable characters={characters} />}
      {activeTab === 'shard' && <ItemRewardStatsSection characters={characterOptions} rewardType="SHARD" />}
      {activeTab === 'azenaBlessing' && <ItemRewardStatsSection characters={characterOptions} rewardType="AZENA_BLESSING" />}

      <OtherIncomeModal
        open={isOtherIncomeOpen}
        onClose={() => setIsOtherIncomeOpen(false)}
        characters={characterOptions}
        onRecorded={refresh}
      />
    </div>
  )
}
