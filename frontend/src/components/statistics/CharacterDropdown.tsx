import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface CharacterOption {
  characterId: string
  characterName: string
}

export interface CharacterDropdownProps {
  characters: CharacterOption[]
  /** null = "모든 캐릭터" 선택 상태 */
  selectedId: string | null
  onChange: (characterId: string | null) => void
  className?: string
  /** false면 "모든 캐릭터" 옵션 자체를 숨긴다(항상 특정 캐릭터 하나를 골라야 하는 경우). */
  allowAll?: boolean
}

/** "모든 캐릭터" 버튼을 누르면 펼쳐지는, 특정 캐릭터 하나를 고르는 드롭다운. */
export function CharacterDropdown({ characters, selectedId, onChange, className, allowAll = true }: CharacterDropdownProps) {
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

  const selectedName =
    characters.find((c) => c.characterId === selectedId)?.characterName ?? (allowAll ? '모든 캐릭터' : '캐릭터 선택')

  return (
    <div ref={rootRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {selectedName}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
          {allowAll && (
            <>
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className={cn(
                  'w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                  selectedId === null ? 'font-semibold text-primary' : 'text-foreground',
                )}
              >
                모든 캐릭터
              </button>
              <div className="my-1 border-t border-border" />
            </>
          )}
          {characters.map((character) => (
            <button
              key={character.characterId}
              type="button"
              onClick={() => {
                onChange(character.characterId)
                setOpen(false)
              }}
              className={cn(
                'w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted',
                selectedId === character.characterId ? 'font-semibold text-primary' : 'text-foreground',
              )}
            >
              {character.characterName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
