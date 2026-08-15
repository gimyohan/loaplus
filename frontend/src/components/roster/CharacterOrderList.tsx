import { GripVertical } from 'lucide-react'
import { useEffect, useState, type DragEvent } from 'react'

import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { fetchCardOrder, swapCardOrder } from '@/lib/dashboards'
import { cn } from '@/lib/utils'

const itemLevelFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface CharacterOrderListProps {
  /** 스왑이 서버에 반영된 뒤 호출된다 — 대시보드 탭의 카드 순서를 다시 불러오는 등에 쓴다. */
  onOrderChanged?: () => void
}

/**
 * 대시보드 카드 순서(Characters.display_order)를 보여주고, 드래그해서 놓은 카드와 자리를
 * 맞바꾼다(PATCH /api/dashboards/swap, docs/api.typ 참고). 끼워넣기가 아니라 스왑이라 드래그한
 * 카드와 놓은 카드 두 자리만 바뀌고 그 사이 카드들의 순서는 그대로 유지된다.
 */
export function CharacterOrderList({ onOrderChanged }: CharacterOrderListProps) {
  const { characters, isLoading: isCharactersLoading } = useCharacterDirectory()
  const [order, setOrder] = useState<string[] | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCardOrder()
      .then((ids) => {
        if (!cancelled) setOrder(ids)
      })
      .catch((err) => console.error('카드 순서 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [])

  const handleDrop = (targetId: string) => {
    const sourceId = draggingId
    setDraggingId(null)
    setDragOverId(null)
    if (!sourceId || sourceId === targetId) return

    // 낙관적으로 두 자리만 맞바꾼다 — 끼워넣기가 아니라 스왑이므로 그 사이 카드들은 그대로 둔다.
    setOrder((prev) => {
      if (!prev) return prev
      const next = [...prev]
      const i = next.indexOf(sourceId)
      const j = next.indexOf(targetId)
      if (i === -1 || j === -1) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

    swapCardOrder(sourceId, targetId)
      .then((nextOrder) => {
        setOrder(nextOrder)
        onOrderChanged?.()
      })
      .catch((err) => {
        console.error('카드 순서 변경 실패', err)
        // 실패하면 서버의 실제 순서로 되돌린다 — 낙관적으로 바꿔둔 로컬 상태가 어긋나지 않도록.
        fetchCardOrder().then(setOrder).catch(() => {})
      })
  }

  if (order === null || isCharactersLoading) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>
  }

  const orderedCharacters = order
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is NonNullable<typeof character> => Boolean(character))

  if (orderedCharacters.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 캐릭터가 없습니다.</p>
  }

  return (
    // 세로로 한 줄씩 늘어놓는 대신, 대시보드 카드 그리드와 동일하게 한 행에 여러 블록을 배치한다
    // (대시보드는 DashboardView.tsx의 COLUMNS_PER_ROW=3 고정 — 여기도 큰 화면에서 3열로 맞춘다).
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {orderedCharacters.map((character, index) => (
        <div
          key={character.id}
          draggable
          onDragStart={() => setDraggingId(character.id)}
          onDragOver={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            if (dragOverId !== character.id) setDragOverId(character.id)
          }}
          onDragLeave={() => setDragOverId((prev) => (prev === character.id ? null : prev))}
          onDrop={(event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            handleDrop(character.id)
          }}
          onDragEnd={() => {
            setDraggingId(null)
            setDragOverId(null)
          }}
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
