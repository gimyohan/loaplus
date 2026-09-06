import { Button } from '@/components/ui/button'
import type { CharacterSibling } from '@/types/character'

const itemLevelFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface SiblingTableProps {
  siblings: CharacterSibling[]
  isRegistered: (characterName: string) => boolean
  selectedNames: Set<string>
  onToggleSelected: (characterName: string) => void
  isAdding: boolean
  onAddSelected: () => void
  addSummary: string | null
}

/** RosterView(실사용)와 로그인 전 미리보기(PreviewRosterView)가 함께 쓰는 순수 표시 컴포넌트 —
 * fetchCharacterSiblings/resolveByName 같은 API 호출은 전혀 하지 않으므로, 실제 UI가 바뀌면
 * 두 곳 모두 그대로 따라간다(사용자 확인). */
export function SiblingTable({
  siblings,
  isRegistered,
  selectedNames,
  onToggleSelected,
  isAdding,
  onAddSelected,
  addSummary,
}: SiblingTableProps) {
  if (siblings.length === 0) {
    return <p className="text-sm text-muted-foreground">원정대에 속한 캐릭터가 없습니다.</p>
  }

  return (
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
              const registered = isRegistered(sibling.characterName)
              return (
                <tr key={sibling.characterName} className={registered ? 'opacity-50' : undefined}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={registered || selectedNames.has(sibling.characterName)}
                      disabled={registered || isAdding}
                      onChange={() => onToggleSelected(sibling.characterName)}
                      aria-label={`${sibling.characterName} 선택`}
                      className="h-4 w-4 rounded border border-border disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {sibling.characterName}
                    {registered && <span className="ml-2 text-xs text-muted-foreground">(등록됨)</span>}
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
        <Button onClick={onAddSelected} disabled={selectedNames.size === 0 || isAdding}>
          {isAdding ? '추가 중...' : `선택한 ${selectedNames.size}명 카드로 추가`}
        </Button>
        {addSummary && <p className="text-sm text-muted-foreground">{addSummary}</p>}
      </div>
    </div>
  )
}
