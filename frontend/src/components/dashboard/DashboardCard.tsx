import { WidgetDashboard } from '@/components/dashboard/WidgetDashboard'
import { CARD_WIDTH } from '@/lib/widgetCatalog'
import { cn } from '@/lib/utils'

export interface DashboardCardProps {
  /** 이미 실제 캐릭터에 귀속된 카드라면 그 캐릭터 이름. 없으면 아직 검색으로 귀속 전인 새 카드. */
  initialCharacterName?: string
  /** true면 마운트되자마자 위젯 설정 모달을 자동으로 연다(Add Character로 막 추가된 카드). */
  autoOpenSettings?: boolean
  onRemove: () => void
  /** 이름 검색으로 실제 캐릭터에 (처음) 귀속되면 그 characterId를 알려준다. */
  onBound: (characterId: string) => void
  /** 카드 폭. 생략하면 CARD_WIDTH(350px). 모바일처럼 화면이 더 좁을 때만 줄여서 넘긴다. */
  width?: number
  className?: string
}

/**
 * 대시보드의 캐릭터 카드 한 장. 카드는 고정 폭이고 위젯을 위→아래로 쌓으므로 높이는 위젯 수만큼
 * 자연스럽게 늘어난다 — 예전처럼 카드를 화면 폭에 맞춰 통째로 확대·축소하지 않는다
 * (docs/ui_redesign.md "현재 구조와 문제의 원인").
 */
export function DashboardCard({
  initialCharacterName,
  autoOpenSettings,
  onRemove,
  onBound,
  width = CARD_WIDTH,
  className,
}: DashboardCardProps) {
  return (
    <div className={cn('shrink-0', className)} style={{ width }}>
      <WidgetDashboard
        initialCharacterName={initialCharacterName}
        autoOpenSettings={autoOpenSettings}
        onRemove={onRemove}
        cardWidth={width}
        onCharacterNameChange={(_name, characterId) => {
          // characterId는 CharacterNameForm이 resolveByName 결과를 그대로 넘겨준 값이다 — 여기서
          // findByName으로 다시 찾으면, 방금 등록된 캐릭터는 컨텍스트 갱신이 아직 반영되기 전이라
          // 못 찾을 수 있다(카드 id가 임시 uuid로 남아 설정 모달이 다시 열리던 버그의 원인).
          if (characterId) onBound(characterId)
        }}
      />
    </div>
  )
}
