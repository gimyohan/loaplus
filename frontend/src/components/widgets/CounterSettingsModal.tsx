import { Minus, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface CounterSettingsValue {
  text: string
  count: number
}

export interface CounterSettingsModalProps {
  open: boolean
  onClose: () => void
  /** 이 위젯이 놓인 카드에 귀속된 캐릭터 이름(다른 Default Value 위젯 설정 모달과 동일한 규칙) */
  characterName: string
  text: string
  count: number
  onSave: (value: CounterSettingsValue) => void
}

/**
 * 카운터 위젯의 톱니바퀴를 누르면 뜨는 설정 모달 — 텍스트와 숫자를 직접 편집한다
 * (docs/widgets.typ 참고). 루틴의 반복 옵션 같은 자동 초기화는 없다 — 숫자는 카드를 누를 때만
 * 줄어들고, 여기서는 실수로 줄인 값을 되돌리거나 새 카운터로 재설정할 때만 쓴다.
 */
export function CounterSettingsModal({
  open,
  onClose,
  characterName,
  text,
  count,
  onSave,
}: CounterSettingsModalProps) {
  const [textValue, setTextValue] = useState(text)
  const [countValue, setCountValue] = useState(count)

  useEffect(() => {
    if (!open) return
    setTextValue(text)
    setCountValue(count)
  }, [open, text, count])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ text: textValue, count: Math.max(0, Math.trunc(countValue)) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`${characterName}의 카운터 설정`} className="max-w-xs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="counter-text" className="text-sm font-medium text-foreground">
            텍스트
          </label>
          <input
            id="counter-text"
            type="text"
            autoFocus
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="카운터 이름을 입력하세요"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">숫자</h3>
          <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-muted p-4">
            <button
              type="button"
              aria-label="숫자 감소"
              onClick={() => setCountValue((prev) => Math.max(0, prev - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              value={countValue}
              onChange={(event) => setCountValue(Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-lg font-semibold text-foreground"
            />
            <button
              type="button"
              aria-label="숫자 증가"
              onClick={() => setCountValue((prev) => prev + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  )
}
