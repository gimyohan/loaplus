import { AddCharacterCard } from '@/components/dashboard/AddCharacterCard'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { DashboardCardCarousel } from '@/components/dashboard/DashboardCardCarousel'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MAX_CHARACTERS_PER_USER } from '@/lib/characters'

export interface DashboardViewProps {
  cardIds: string[]
  /** Add Character로 막 추가된 카드의 id. 일치하는 카드는 마운트되자마자 위젯 설정 모달을 자동으로 연다. */
  autoOpenCardId?: string | null
  onRemoveCard: (id: string) => void
  /** 카드(id)가 실제 캐릭터(characterId)에 처음 귀속됐을 때 호출된다. */
  onCardBound: (id: string, characterId: string) => void
  onAddCharacter: () => void
}

export function DashboardView({
  cardIds,
  autoOpenCardId,
  onRemoveCard,
  onCardBound,
  onAddCharacter,
}: DashboardViewProps) {
  const { characters } = useCharacterDirectory()
  const isMobile = useIsMobile()
  // 이미 최대 개수를 등록한 상태면 "새 카드 추가" 타일 자체를 숨긴다 — 어차피 이름을 입력하는
  // 순간 서버가 거부할 걸 알면서 빈 카드부터 만들게 두는 건 혼란만 준다.
  const atCharacterLimit = characters.length >= MAX_CHARACTERS_PER_USER

  if (cardIds.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-muted-foreground">등록된 카드가 없습니다. 아래에서 캐릭터를 추가해 보세요.</p>
        {!atCharacterLimit && <AddCharacterCard onClick={onAddCharacter} />}
      </div>
    )
  }

  if (isMobile) {
    return (
      <DashboardCardCarousel
        cardIds={cardIds}
        autoOpenCardId={autoOpenCardId}
        onRemoveCard={onRemoveCard}
        onCardBound={onCardBound}
        onAddCharacter={onAddCharacter}
      />
    )
  }

  // 카드는 고정 폭(CARD_WIDTH)이라 한 줄에 몇 장이 들어갈지는 화면 폭이 정하고, 남는 카드는 다음
  // 줄로 넘어간다(docs/ui_redesign.md "화면 폭과 카드 개수"). items-start: 카드마다 위젯 수가 달라
  // 높이가 다르므로 같은 줄 카드를 가장 큰 높이로 늘리지 않는다.
  return (
    <div className="flex flex-wrap items-start gap-4">
      {cardIds.map((id) => {
        // 이미 실제 캐릭터로 등록된 id라면 이름을 미리 채워 마운트 즉시 위젯 목록을 조회하게 한다.
        const boundCharacter = characters.find((character) => character.id === id)
        // id는 사이드바 캐릭터 목록에서 이 카드로 스크롤할 때 쓰는 앵커다(App.tsx handleCharacterClick).
        return (
          <div key={id} id={`dashboard-card-${id}`} className="scroll-mt-6 rounded-xl">
            <DashboardCard
              initialCharacterName={boundCharacter?.characterName}
              autoOpenSettings={id === autoOpenCardId}
              onRemove={() => onRemoveCard(id)}
              onBound={(characterId) => onCardBound(id, characterId)}
            />
          </div>
        )
      })}
      {!atCharacterLimit && <AddCharacterCard onClick={onAddCharacter} />}
    </div>
  )
}
