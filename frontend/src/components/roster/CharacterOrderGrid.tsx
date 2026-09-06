import { GripVertical } from 'lucide-react'
import type { DragEvent } from 'react'

import { cn } from '@/lib/utils'
import type { CharacterSummary } from '@/types/character'

const itemLevelFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface CharacterOrderGridProps {
  /** 이미 순서대로 정렬된 캐릭터 목록 */
  characters: CharacterSummary[]
  draggingId: string | null
  dragOverId: string | null
  onDragStart: (characterId: string) => void
  onDragOverCharacter: (characterId: string) => void
  onDragLeaveCharacter: (characterId: string) => void
  onDrop: (characterId: string) => void
  onDragEnd: () => void
}

/** CharacterOrderList(실사용)와 로그인 전 미리보기(PreviewRosterView)가 함께 쓰는 순수 표시
 * 컴포넌트 — swapCardOrder 같은 API 호출은 전혀 하지 않으므로, 실제 UI가 바뀌면 두 곳 모두
 * 그대로 따라간다(사용자 확인). */
export function CharacterOrderGrid({
  characters,
  draggingId,
  dragOverId,
  onDragStart,
  onDragOverCharacter,
  onDragLeaveCharacter,
  onDrop,
  onDragEnd,
}: CharacterOrderGridProps) {
  if (characters.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 캐릭터가 없습니다.</p>
  }

  return (
    // 세로로 한 줄씩 늘어놓는 대신, 대시보드 카드 그리드와 동일하게 한 행에 여러 블록을 배치한다
    // (대시보드는 DashboardView.tsx의 COLUMNS_PER_ROW=3 고정 — 여기도 큰 화면에서 3열로 맞춘다).
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character, index) => (
        <div
          key={character.id}
          draggable
          onDragStart={() => onDragStart(character.id)}
          onDragOver={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            if (dragOverId !== character.id) onDragOverCharacter(character.id)
          }}
          onDragLeave={() => onDragLeaveCharacter(character.id)}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            onDrop(character.id)
          }}
          onDragEnd={onDragEnd}
          className={cn(
            'flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors active:cursor-grabbing',
            draggingId === character.id && 'opacity-40',
            dragOverId === character.id && draggingId !== character.id && 'border-primary bg-primary/10',
          )}
        >
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="w-5 shrink-0 text-center font-mono text-xs text-muted-foreground">{index + 1}</span>

            {character.imageUrl ? (
              <img
                src={character.imageUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-full border border-border bg-muted" aria-hidden="true" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{character.characterName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {character.server} · {character.job}
              </p>
            </div>
          </div>

          <span className="self-end font-mono text-sm font-bold text-secondary">
            {itemLevelFormatter.format(character.itemLevel)}
          </span>
        </div>
      ))}
    </div>
  )
}
