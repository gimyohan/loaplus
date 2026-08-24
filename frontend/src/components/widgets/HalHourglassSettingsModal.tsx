import { Minus, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { HalHourglassSummary } from '@/types/halHourglass'

const MAX_SAND_STACK = 5

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export interface HalHourglassSettingsModalProps {
  open: boolean
  onClose: () => void
  characterName: string
  data: HalHourglassSummary
  /** 원래 값과의 차이(delta)를 전달한다 — 서버 엔드포인트가 delta 방식이기 때문이다 */
  onSave: (delta: number) => void
}

/**
 * 할의 모래시계 위젯의 톱니바퀴를 누르면 뜨는 설정 모달. 시련의 모래 스택을 직접 조절한다
 * (docs/widgets.typ 참고). 보상을 지급하지 않는 단순 상태 조정이라 로그를 남기지 않는다.
 */
export function HalHourglassSettingsModal({
  open,
  onClose,
  characterName,
  data,
  onSave,
}: HalHourglassSettingsModalProps) {
  const [sandStack, setSandStack] = useState(data.sandStack)

  useEffect(() => {
    if (open) setSandStack(data.sandStack)
  }, [open, data])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const delta = sandStack - data.sandStack
    if (delta !== 0) onSave(delta)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`${characterName}의 할의 모래시계 설정`} className="max-w-xs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">시련의 모래 스택</h3>
          <div className="flex items-center justify-center gap-4 rounded-lg border border-border bg-muted p-4">
            <button
              type="button"
              aria-label="스택 감소"
              onClick={() => setSandStack((prev) => clamp(prev - 1, 0, MAX_SAND_STACK))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-mono text-lg font-semibold text-foreground">
              {sandStack}
            </span>
            <button
              type="button"
              aria-label="스택 증가"
              onClick={() => setSandStack((prev) => clamp(prev + 1, 0, MAX_SAND_STACK))}
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
