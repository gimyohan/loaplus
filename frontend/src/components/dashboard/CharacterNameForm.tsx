import { Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { describeCharacterApiError } from '@/lib/characters'
import { cn } from '@/lib/utils'

export interface CharacterNameFormProps {
  className?: string
  /** 이 카드에 귀속된 캐릭터 이름. 아직 귀속되지 않았으면 빈 문자열. */
  characterName: string
  /** 처음 등록하는(직전까지 CharacterDirectoryContext에 없던) 캐릭터면 resolveByName이 반환하는
   * characterId를 함께 넘긴다 — 호출하는 쪽에서 컨텍스트를 다시 findByName으로 조회하면, 그 조회가
   * 이 콜백보다 먼저 실행돼도 setCharacters 갱신이 아직 반영되기 전이라 못 찾을 수 있다(리액트
   * 상태 갱신은 비동기라 이 함수 안에서 await 직후에도 아직 새 캐릭터가 없을 수 있음) — 그래서
   * 조회 대신 이 결과값을 그대로 전달한다. */
  onCharacterNameChange: (characterName: string, characterId?: string) => void
  /** true면 이 카드의 캐릭터 귀속이 이미 확정돼 이름을 더 바꿀 수 없다 — 카드 하나가 곧 그
   * 캐릭터라는 귀속을 굳힌다(사용자 확인). 한 번 확정되면 그 뒤 위젯을 전부 지워도 다시 풀리지
   * 않는다 — "위젯을 비우면 이름을 다시 바꿀 수 있다"는 구멍을 두면, 원래 캐릭터가 어느 카드에도
   * 안 보이면서 DB에는 그대로 남는 상태가 될 수 있기 때문이다. 되돌리려면 카드 자체를 삭제(그
   * 캐릭터를 영구 삭제)하고 새로 만드는 수밖에 없다 — 그 전, 귀속이 아직 확정되지 않은 동안은
   * 오타 등을 자유롭게 고칠 수 있도록 잠그지 않는다. */
  locked?: boolean
}

/**
 * 이 카드가 어떤 캐릭터에 귀속되는지 지정하는 입력 폼. 입력한 이름이 이미 등록돼 있으면 그대로
 * 조회하고, 아니면 Open API로 실존 여부를 확인해 새로 등록한 뒤 카드에 귀속시킨다
 * (docs/db_schema.typ: Default Value는 위젯이 아니라 캐릭터에 종속).
 */
export function CharacterNameForm({
  className,
  characterName,
  onCharacterNameChange,
  locked = false,
}: CharacterNameFormProps) {
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
      const resolved = await resolveByName(name)
      onCharacterNameChange(name, resolved.id)
    } catch (err) {
      setResolveError(describeCharacterApiError(err))
    } finally {
      setIsResolving(false)
    }
  }

  if (locked) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-card p-3',
          className,
        )}
      >
        <Tooltip label="배치가 저장된 뒤에는 캐릭터를 바꿀 수 없습니다">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Tooltip>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{characterName}</span>
      </div>
    )
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
      {resolveError && <p className="text-xs text-danger">{resolveError}</p>}
    </form>
  )
}
