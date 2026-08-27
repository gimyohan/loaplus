import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { CharacterOption } from '@/components/statistics/CharacterDropdown'
import { cn } from '@/lib/utils'

/** "모든 캐릭터"도 개별 캐릭터와 동등한 하나의 선택 항목으로 다룬다 — CharacterDropdown(단일
 * 선택, null이 "모든 캐릭터")과 달리 이 컴포넌트는 여러 개를 동시에 켤 수 있어야 하므로,
 * "모든 캐릭터"만 특별 취급하지 않고 같은 목록 안의 항목 하나로 둔다. */
export const ALL_CHARACTERS_ID = '__all__'

export interface CharacterMultiSelectProps {
  characters: CharacterOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  className?: string
}

/** "모든 캐릭터" + 캐릭터 각각을 체크박스로 동시에 여러 개 고르는 드롭다운. 항목을 눌러도
 * 드롭다운이 닫히지 않는다(CharacterDropdown과 달리 여러 번 눌러 고를 걸 전제하므로) —
 * 바깥을 클릭해야 닫힌다. */
export function CharacterMultiSelect({ characters, selectedIds, onChange, className }: CharacterMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id])
  }

  const label = useMemo(() => {
    if (selectedIds.length === 0) return '캐릭터 선택'
    if (selectedIds.length === 1) {
      const id = selectedIds[0]!
      if (id === ALL_CHARACTERS_ID) return '모든 캐릭터'
      return characters.find((c) => c.characterId === id)?.characterName ?? '캐릭터 1명'
    }
    return `${selectedIds.length}개 선택`
  }, [selectedIds, characters])

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex select-none items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        // select-none: 체크박스를 연달아 여러 개 누를 때 라벨 텍스트가 드래그로 선택돼버리는 것을 막는다.
        <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-56 select-none overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted">
            <input
              type="checkbox"
              checked={selectedIds.includes(ALL_CHARACTERS_ID)}
              onChange={() => toggle(ALL_CHARACTERS_ID)}
              className="h-3.5 w-3.5 accent-primary"
            />
            모든 캐릭터
          </label>
          <div className="my-1 border-t border-border" />
          {characters.map((character) => (
            <label
              key={character.characterId}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(character.characterId)}
                onChange={() => toggle(character.characterId)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {character.characterName}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
