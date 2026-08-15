import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface ParadiseGoldRewardModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (amount: number, description?: string) => void
}

/**
 * 낙원 위젯의 귀속골드 획득 버튼을 누르면 뜨는 입력 모달. 낙원은 귀속골드만 지급하므로
 * (docs/statistics.typ 참고) 기타 수입 기록과 달리 캐릭터 선택·일반 골드 필드 없이 금액만 받는다.
 * 설명은 선택 입력 — 기타 수입 기록과 달리 이 행위 자체가 "낙원에서 귀속골드를 얻었다"는 의미를
 * 이미 갖고 있어 필수는 아니지만, 남기면 로그 목록에서 구분하기 쉽다(docs/api.typ 참고).
 */
export function ParadiseGoldRewardModal({ open, onClose, onSubmit }: ParadiseGoldRewardModalProps) {
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(0)
      setDescription('')
    }
  }, [open])

  const canSubmit = amount > 0

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit(amount, description.trim() || undefined)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="귀속골드 획득 기록" className="max-w-xs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          id="paradise-gold-reward-amount"
          type="number"
          min={0}
          autoFocus
          value={amount === 0 ? '' : amount}
          onChange={(event) => setAmount(Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
          placeholder="0"
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-right font-mono text-sm text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="paradise-gold-reward-description" className="text-sm font-medium text-foreground">
            설명 <span className="font-normal text-muted-foreground">(선택)</span>
          </label>
          <input
            id="paradise-gold-reward-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="예)지옥 상자"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            기록
          </Button>
        </div>
      </form>
    </Modal>
  )
}
