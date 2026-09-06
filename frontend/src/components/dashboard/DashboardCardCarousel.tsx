import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useEffect, useState } from 'react'

import { AddCharacterCard } from '@/components/dashboard/AddCharacterCard'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { useElementWidth } from '@/hooks/useElementWidth'
import { MAX_CHARACTERS_PER_USER } from '@/lib/characters'

// 카드가 많을 때 한 칸씩 넘기기 답답하지 않도록, 3칸씩 건너뛰는 이동 버튼도 함께 둔다(사용자 확정).
const JUMP_SIZE = 3

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
  // 이미 최대 개수를 등록한 상태면 "새 카드 추가" 슬라이드 자체를 없앤다 — 어차피 이름을 입력하는
  // 순간 서버가 거부할 걸 알면서 빈 카드부터 만들게 두는 건 혼란만 준다(docs/api.typ 참고).
  const atCharacterLimit = characters.length >= MAX_CHARACTERS_PER_USER
  const slideCount = cardIds.length + (atCharacterLimit ? 0 : 1)
  const isAddSlide = !atCharacterLimit && index === cardIds.length

  // 카드가 삭제되는 등 목록이 짧아져 현재 인덱스가 범위를 벗어나면 마지막 슬라이드로 당겨온다.
  useEffect(() => {
    setIndex((prev) => Math.min(prev, slideCount - 1))
  }, [slideCount])

  const currentId = isAddSlide ? undefined : cardIds[index]
  const boundCharacter = currentId ? characters.find((character) => character.id === currentId) : undefined

  return (
    <div ref={ref} className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`${JUMP_SIZE}칸 이전 카드`}
            disabled={index === 0}
            onClick={() => setIndex((prev) => Math.max(prev - JUMP_SIZE, 0))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronsLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="이전 카드"
            disabled={index === 0}
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {index + 1} / {slideCount}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="다음 카드"
            disabled={index === slideCount - 1}
            onClick={() => setIndex((prev) => Math.min(prev + 1, slideCount - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label={`${JUMP_SIZE}칸 다음 카드`}
            disabled={index === slideCount - 1}
            onClick={() => setIndex((prev) => Math.min(prev + JUMP_SIZE, slideCount - 1))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
        </div>
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
