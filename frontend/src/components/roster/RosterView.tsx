import { useState, type FormEvent } from 'react'

import { CharacterOrderList } from '@/components/roster/CharacterOrderList'
import { Button } from '@/components/ui/button'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { describeCharacterApiError, fetchCharacterSiblings } from '@/lib/characters'
import type { CharacterSibling } from '@/types/character'

const itemLevelFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface RosterViewProps {
  /** 캐릭터가 새로 등록되거나 카드 순서가 바뀌었을 때 호출된다 — 대시보드 탭의 카드 순서를
   * 다시 불러오는 등에 쓴다. */
  onRosterChanged?: () => void
}

/**
 * 원정대 일괄 추가. 캐릭터 이름 하나로 같은 원정대 소속 전체 목록을 조회한 뒤(Open API
 * siblings), 아직 등록 안 된 캐릭터들을 한 번에 골라 카드로 추가한다. 한 명씩 검색해서
 * 추가하던 기존 방식(WidgetPalette)을 대체하지는 않고, 여러 캐릭터를 빠르게 등록하는
 * 보조 경로로 둔다.
 */
export function RosterView({ onRosterChanged }: RosterViewProps) {
  const { findByName, resolveByName } = useCharacterDirectory()

  const [nameInput, setNameInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [siblings, setSiblings] = useState<CharacterSibling[] | null>(null)
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set())

  const [isAdding, setIsAdding] = useState(false)
  const [addSummary, setAddSummary] = useState<string | null>(null)

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault()
    const name = nameInput.trim()
    if (!name) return

    setIsSearching(true)
    setSearchError(null)
    setAddSummary(null)
    try {
      const result = await fetchCharacterSiblings(name)
      setSiblings(result)
      // 아직 등록 안 된 캐릭터를 기본으로 전부 선택해서 "일괄 추가"에 바로 쓸 수 있게 한다.
      setSelectedNames(
        new Set(result.filter((sibling) => !findByName(sibling.characterName)).map((sibling) => sibling.characterName)),
      )
    } catch (err) {
      setSiblings(null)
      setSearchError(describeCharacterApiError(err))
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSelected = (name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleAddSelected = async () => {
    const targets = [...selectedNames]
    if (targets.length === 0) return

    setIsAdding(true)
    setAddSummary(null)
    let successCount = 0
    const failures: string[] = []

    // Open API 호출 제한(분당 100회) 안에서 안전하게 처리하려고 병렬이 아니라 순차로 등록한다.
    for (const name of targets) {
      try {
        await resolveByName(name)
        successCount += 1
      } catch (err) {
        failures.push(`${name}: ${describeCharacterApiError(err)}`)
      }
    }

    setSelectedNames(new Set())
    setIsAdding(false)
    setAddSummary(
      failures.length === 0
        ? `${successCount}명 추가 완료`
        : `${successCount}명 추가 완료, ${failures.length}명 실패 — ${failures.join(', ')}`,
    )
    if (successCount > 0) onRosterChanged?.()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">카드 순서</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            드래그해서 다른 카드 위에 놓으면 두 캐릭터의 순서가 서로 맞바뀝니다
          </p>
        </div>
        <CharacterOrderList onOrderChanged={onRosterChanged} />
      </div>

      <div className="border-t border-border" />

      <div>
        <h3 className="text-sm font-semibold text-foreground">원정대 일괄 추가</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          원정대에 속한 캐릭터 중 원하는 캐릭터들을 한 번에 카드로 추가하세요
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">캐릭터 이름</span>
          <input
            type="text"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="원정대에 속한 캐릭터 이름 하나만 입력하세요"
            className="w-80 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? '조회 중...' : '원정대 조회'}
        </Button>
        {searchError && <p className="w-full text-sm text-destructive">{searchError}</p>}
      </form>

      {siblings && siblings.length === 0 && (
        <p className="text-sm text-muted-foreground">원정대에 속한 캐릭터가 없습니다.</p>
      )}

      {siblings && siblings.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="px-3 py-2 text-left">캐릭터</th>
                  <th className="px-3 py-2 text-left">서버</th>
                  <th className="px-3 py-2 text-left">직업</th>
                  <th className="px-3 py-2 text-right">아이템 레벨</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {siblings.map((sibling) => {
                  const isRegistered = Boolean(findByName(sibling.characterName))
                  return (
                    <tr key={sibling.characterName} className={isRegistered ? 'opacity-50' : undefined}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isRegistered || selectedNames.has(sibling.characterName)}
                          disabled={isRegistered || isAdding}
                          onChange={() => toggleSelected(sibling.characterName)}
                          aria-label={`${sibling.characterName} 선택`}
                          className="h-4 w-4 rounded border border-border disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {sibling.characterName}
                        {isRegistered && <span className="ml-2 text-xs text-muted-foreground">(등록됨)</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{sibling.serverName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{sibling.className}</td>
                      <td className="px-3 py-2 text-right font-mono text-secondary">
                        {itemLevelFormatter.format(sibling.itemLevel)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleAddSelected} disabled={selectedNames.size === 0 || isAdding}>
              {isAdding ? '추가 중...' : `선택한 ${selectedNames.size}명 카드로 추가`}
            </Button>
            {addSummary && <p className="text-sm text-muted-foreground">{addSummary}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
