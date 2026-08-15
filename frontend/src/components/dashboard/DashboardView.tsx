import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { DashboardCardCarousel } from '@/components/dashboard/DashboardCardCarousel'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { useElementWidth } from '@/hooks/useElementWidth'
import { useIsMobile } from '@/hooks/useIsMobile'

export interface DashboardViewProps {
  cardIds: string[]
  onRemoveCard: (id: string) => void
  /** 카드(id)가 실제 캐릭터(characterId)에 처음 귀속됐을 때 호출된다. */
  onCardBound: (id: string, characterId: string) => void
}

const GRID_GAP = 24
// 카드 한 칸이 이보다 좁아지면 읽기 힘들어지므로, 화면이 좁을 땐 COLUMNS_PER_ROW보다 실제로는
// 적게 배치한다("화면 크기도 고려" 요구사항).
const MIN_CARD_WIDTH = 150
// 한 줄에 배치할 카드 수. 사용자가 고를 수 있게 했던 적이 있었으나(Roster 탭), 카드 높이가 폭에
// 비례해 커지면서 세로 스크롤바가 나타났다 사라졌다 하고 그때마다 뷰포트 폭이 미세하게 바뀌어
// 카드 크기가 계속 흔들리는 문제가 있어 우선 3열로 고정한다.
const COLUMNS_PER_ROW = 3

export function DashboardView({ cardIds, onRemoveCard, onCardBound }: DashboardViewProps) {
  const { characters } = useCharacterDirectory()
  const isMobile = useIsMobile()
  const { ref, width: containerWidth } = useElementWidth<HTMLDivElement>()

  if (cardIds.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border py-24 text-center text-sm text-muted-foreground">
        등록된 카드가 없습니다. 사이드바의 "Add Character"로 카드를 추가해 보세요.
      </p>
    )
  }

  if (isMobile) {
    return <DashboardCardCarousel cardIds={cardIds} onRemoveCard={onRemoveCard} onCardBound={onCardBound} />
  }

  // 화면 폭이 좁으면 COLUMNS_PER_ROW만큼 배치했을 때 카드가 MIN_CARD_WIDTH보다 좁아질 수 있으므로,
  // 실제로 배치할 열 수는 (화면에 들어가는 최대 열 수)와 COLUMNS_PER_ROW 중 작은 값으로 줄인다.
  const maxColumnsForWidth = Math.max(1, Math.floor((containerWidth + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP)))
  const effectiveColumns = Math.min(COLUMNS_PER_ROW, maxColumnsForWidth)
  const cardWidth =
    containerWidth > 0 ? (containerWidth - GRID_GAP * (effectiveColumns - 1)) / effectiveColumns : 0

  return (
    // containerWidth를 재기 전(첫 렌더)엔 카드 크기를 계산할 수 없으므로, ref는 항상 걸어 너비부터
    // 잰 뒤(거의 즉시) 카드를 그린다 — 그래야 원본 크기로 한 번 그렸다가 줄어드는 플래시 없이 바로
    // 알맞은 크기로 나온다.
    // items-start: 카드마다 그리드 높이(rows)가 달라질 수 있으므로, 기본값인 stretch로 같은 줄의
    // 카드를 전부 가장 큰 카드 높이에 맞춰 늘리지 않고, 각자 원래 높이 그대로 줄 위쪽에 맞춘다.
    <div
      ref={ref}
      className="grid items-start justify-center gap-6"
      style={{ gridTemplateColumns: `repeat(${effectiveColumns}, ${cardWidth}px)` }}
    >
      {containerWidth > 0 &&
        cardIds.map((id) => {
          // 이미 실제 캐릭터로 등록된 id(GET /api/dashboards에서 온 카드)라면 이름을 미리 채워서
          // WidgetDashboard가 마운트되자마자 위젯 배치를 서버에서 조회하도록 한다.
          const boundCharacter = characters.find((character) => character.id === id)
          return (
            <DashboardCard
              key={id}
              initialCharacterName={boundCharacter?.characterName}
              onRemove={() => onRemoveCard(id)}
              onBound={(characterId) => onCardBound(id, characterId)}
              width={cardWidth}
            />
          )
        })}
    </div>
  )
}
