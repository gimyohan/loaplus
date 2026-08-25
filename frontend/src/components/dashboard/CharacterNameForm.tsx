import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { describeCharacterApiError } from '@/lib/characters'
import { cn } from '@/lib/utils'

export interface CharacterNameFormProps {
  className?: string
  /** 이 카드에 귀속된 캐릭터 이름. 아직 귀속되지 않았으면 빈 문자열. */
  characterName: string
  onCharacterNameChange: (characterName: string) => void
}

/**
 * 이 카드가 어떤 캐릭터에 귀속되는지 지정하는 입력 폼. 입력한 이름이 이미 등록돼 있으면 그대로
 * 조회하고, 아니면 Open API로 실존 여부를 확인해 새로 등록한 뒤 카드에 귀속시킨다
 * (docs/db_schema.typ: Default Value는 위젯이 아니라 캐릭터에 종속).
 */
export function CharacterNameForm({ className, characterName, onCharacterNameChange }: CharacterNameFormProps) {
  const { resolveByName } = useCharacterDirectory()
  const [characterNameInput, setCharacterNameInput] = useState(characterName)
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const name = characterNameInput.trim()
    if (!name) {
      onCharacterNameChange('')
      return
    }

    setIsResolving(true)
    setResolveError(null)
    try {
      // 등록된 캐릭터면 그대로 조회하고, 아니면 Open API로 실존 여부를 확인해 새로 등록한 뒤 카드에 귀속시킨다.
      await resolveByName(name)
      onCharacterNameChange(name)
    } catch (err) {
      setResolveError(describeCharacterApiError(err))
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('flex flex-col justify-center gap-2 rounded-xl border border-border bg-card p-3', className)}
    >
      <div className="flex gap-1.5">
        <input
          type="text"
          value={characterNameInput}
          onChange={(event) => setCharacterNameInput(event.target.value)}
          placeholder="캐릭터 이름"
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button type="submit" className="h-8 shrink-0 px-3 py-0 text-xs" disabled={isResolving}>
          {isResolving ? '조회 중...' : '적용'}
        </Button>
      </div>
      {resolveError && <p className="text-xs text-destructive">{resolveError}</p>}
    </form>
  )
}
