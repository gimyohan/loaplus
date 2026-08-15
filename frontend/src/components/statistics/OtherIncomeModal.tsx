import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { CharacterOption } from '@/components/statistics/CharacterDropdown'
import { postOtherIncome } from '@/lib/statistics'

export interface OtherIncomeModalProps {
  open: boolean
  onClose: () => void
  characters: CharacterOption[]
  onRecorded: () => void
}

/**
 * "기타" 골드 카테고리를 채우는 유일한 경로 — 게임 컨텐츠가 자동 집계하지 않는 수입(우편함 보상 등)을
 * 유저가 직접 금액과 사유를 남긴다(docs/statistics.typ "기타 수입 수동 기록"). 검증되지 않은 자기
 * 신고 값이라 표에서 다른 카테고리와 구분하지 않되, 입력 폼 자체에 그 성격을 안내 문구로 남긴다.
 * 사유는 Action_Logs.description에 저장되며, 이 행위는 "무엇을 위한 기록인지" 남기는 게 유일한
 * 목적이라 필수 입력이다(docs/api.typ 참고).
 */
export function OtherIncomeModal({ open, onClose, characters, onRecorded }: OtherIncomeModalProps) {
  const [characterId, setCharacterId] = useState(characters[0]?.characterId ?? '')
  const [goldAmount, setGoldAmount] = useState(0)
  const [boundGoldAmount, setBoundGoldAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCharacterId(characters[0]?.characterId ?? '')
      setGoldAmount(0)
      setBoundGoldAmount(0)
      setDescription('')
      setError(null)
    }
  }, [open, characters])

  const canSubmit = characterId !== '' && (goldAmount > 0 || boundGoldAmount > 0) && description.trim().length > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await postOtherIncome(characterId, { goldAmount, boundGoldAmount, description: description.trim() })
      onRecorded()
      onClose()
    } catch {
      setError('기록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="기타 수입 기록" className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          레이드·편린·아제나 축복·낙원 외의 출처(우편함 보상, 이벤트 보상 등)로 얻은 골드를 직접
          기록합니다. 서버가 사실 여부를 검증하지 않는 자기 신고 값입니다.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="other-income-character" className="text-sm font-medium text-foreground">
            캐릭터
          </label>
          <select
            id="other-income-character"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {characters.map((character) => (
              <option key={character.characterId} value={character.characterId}>
                {character.characterName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="other-income-gold" className="text-sm font-medium text-foreground">
            골드
          </label>
          <input
            id="other-income-gold"
            type="number"
            min={0}
            value={goldAmount}
            onChange={(event) => setGoldAmount(Math.max(0, Math.trunc(Number(event.target.value))))}
            className="w-32 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="other-income-bound-gold" className="text-sm font-medium text-foreground">
            귀속 골드
          </label>
          <input
            id="other-income-bound-gold"
            type="number"
            min={0}
            value={boundGoldAmount}
            onChange={(event) => setBoundGoldAmount(Math.max(0, Math.trunc(Number(event.target.value))))}
            className="w-32 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="other-income-description" className="text-sm font-medium text-foreground">
            사유
          </label>
          <input
            id="other-income-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="예: 우편함 이벤트 보상"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? '기록 중...' : '기록'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
