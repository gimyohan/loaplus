import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AddCharacterCard } from '@/components/dashboard/AddCharacterCard'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { useElementWidth } from '@/hooks/useElementWidth'

export interface DashboardCardCarouselProps {
  cardIds: string[]
  /** Add Character로 막 추가된 카드의 id. 일치하는 카드는 마운트되자마자 위젯 설정 모달을 자동으로 연다. */
  autoOpenCardId?: string | null
  onRemoveCard: (id: string) => void
  onCardBound: (id: string, characterId: string) => void
  onAddCharacter: () => void
}

/**
 * 모바일(md 미만)에서 카드를 한 번에 하나씩만 보여주는 캐러셀. 좁은 화면에 여러 칸짜리 그리드를
 * 욱여넣는 대신, 카드 하나를 화면 너비에 맞춰 최대한 키워서 보여주고 좌우 화살표로 넘긴다. 새 카드
 * 추가 타일을 마지막 한 칸으로 취급해 슬라이드 끝에 둔다.
 */
export function DashboardCardCarousel({
  cardIds,
  autoOpenCardId,
  onRemoveCard,
  onCardBound,
  onAddCharacter,
}: DashboardCardCarouselProps) {
  const { characters } = useCharacterDirectory()
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [index, setIndex] = useState(0)
  const slideCount = cardIds.length + 1
  const isAddSlide = index === cardIds.length

  // 카드가 삭제되는 등 목록이 짧아져 현재 인덱스가 범위를 벗어나면 마지막 슬라이드(추가 타일)로 당겨온다.
  useEffect(() => {
    setIndex((prev) => Math.min(prev, cardIds.length))
  }, [cardIds.length])

  const currentId = isAddSlide ? undefined : cardIds[index]
  const boundCharacter = currentId ? characters.find((character) => character.id === currentId) : undefined

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          aria-label="이전 카드"
          disabled={index === 0}
          onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-mono text-xs text-muted-foreground">
          {index + 1} / {slideCount}
        </span>
        <button
          type="button"
          aria-label="다음 카드"
          disabled={index === slideCount - 1}
          onClick={() => setIndex((prev) => Math.min(prev + 1, slideCount - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {width > 0 &&
        (isAddSlide ? (
          <AddCharacterCard onClick={onAddCharacter} width={width} />
        ) : (
          currentId && (
            <DashboardCard
              key={currentId}
              initialCharacterName={boundCharacter?.characterName}
              autoOpenSettings={currentId === autoOpenCardId}
              onRemove={() => onRemoveCard(currentId)}
              onBound={(characterId) => onCardBound(currentId, characterId)}
              width={width}
            />
          )
        ))}
    </div>
  )
}
