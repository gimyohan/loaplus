import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { ApiError } from '@/lib/api'
import { fetchProfile, updateLostarkApiKey } from '@/lib/user'

/**
 * "내 캐릭터" 목록 보기. 캐릭터 추가는 여기서 하지 않는다 — 각 카드(WidgetDashboard)의
 * 위젯 팔레트에서 캐릭터 이름을 검색하면 그 자리에서 Open API 조회+등록+카드 귀속이 한 번에
 * 일어난다(WidgetPalette 참고). 여기서는 등록된 캐릭터를 한눈에 보고 삭제만 한다.
 */
export function CharacterManager() {
  const { characters, isLoading, remove } = useCharacterDirectory()
  const [hasLostarkApiKey, setHasLostarkApiKey] = useState(true)

  const [isKeyOpen, setIsKeyOpen] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProfile().then((profile) => {
      if (!cancelled) setHasLostarkApiKey(profile.hasLostarkApiKey)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return
    setIsSavingKey(true)
    setKeyError(null)
    try {
      await updateLostarkApiKey(keyInput.trim())
      setHasLostarkApiKey(true)
      setKeyInput('')
      setIsKeyOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        setKeyError(`키 등록에 실패했습니다. (${err.status}${err.code ? ` ${err.code}` : ''})`)
      } else {
        setKeyError('키 등록에 실패했습니다. 백엔드 서버 연결을 확인해 주세요.')
      }
    } finally {
      setIsSavingKey(false)
    }
  }

  if (isLoading) {
    return <p className="w-full max-w-4xl text-sm text-muted-foreground">캐릭터를 불러오는 중...</p>
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">내 캐릭터</h1>
        {!hasLostarkApiKey && (
          <Button variant="outline" onClick={() => setIsKeyOpen(true)}>
            API 키 등록
          </Button>
        )}
      </div>

      {characters.length === 0 && (
        <p className="text-sm text-muted-foreground">
          등록된 캐릭터가 없습니다. 아래 카드의 위젯 목록에서 캐릭터 이름을 검색해 추가해 보세요.
        </p>
      )}

      {characters.map((character) => (
        <div key={character.id} className="flex items-center gap-2">
          <CharacterBannerCompact character={character} className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            aria-label={`${character.characterName} 삭제`}
            onClick={() => {
              remove(character.id).catch(() => {})
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Modal open={isKeyOpen} onClose={() => setIsKeyOpen(false)} title="로스트아크 API 키 등록">
        <div className="flex flex-col gap-3">
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Open API 키"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          {keyError && <p className="text-sm text-red-500">{keyError}</p>}
          <Button onClick={handleSaveKey} disabled={isSavingKey}>
            {isSavingKey ? '저장 중...' : '저장'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
