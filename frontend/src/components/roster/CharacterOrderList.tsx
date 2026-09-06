import { useEffect, useState } from 'react'

import { CharacterOrderGrid } from '@/components/roster/CharacterOrderGrid'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { fetchCardOrder, swapCardOrder } from '@/lib/dashboards'

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

  return (
    <CharacterOrderGrid
      characters={orderedCharacters}
      draggingId={draggingId}
      dragOverId={dragOverId}
      onDragStart={setDraggingId}
      onDragOverCharacter={setDragOverId}
      onDragLeaveCharacter={(id) => setDragOverId((prev) => (prev === id ? null : prev))}
      onDrop={handleDrop}
      onDragEnd={() => {
        setDraggingId(null)
        setDragOverId(null)
      }}
    />
  )
}
