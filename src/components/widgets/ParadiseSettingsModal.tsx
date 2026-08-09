import { HelpCircle } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import type { ParadiseSummary } from '@/types/paradise'

export interface ParadiseSettingsModalProps {
  open: boolean
  onClose: () => void
  characterName: string
  data: ParadiseSummary
  onSave: (next: ParadiseSummary) => void
}

/**
 * 낙원 위젯의 톱니바퀴를 누르면 뜨는 설정 모달. 자동 충전 여부를 토글하고,
 * 티켓/열쇠 수량을 직접 입력해 고칠 수 있다. 자동 충전의 실제 동작(매주 초기화 시점에
 * 티켓 max(현재, 5), 열쇠 +3)은 lib/paradise.ts의 applyParadiseWeeklyRecharge가 담당하며,
 * 여기서는 ?아이콘 툴팁으로 그 규칙을 설명만 한다.
 */
export function ParadiseSettingsModal({
  open,
  onClose,
  characterName,
  data,
  onSave,
}: ParadiseSettingsModalProps) {
  const [autoRecharge, setAutoRecharge] = useState(data.autoRecharge)
  const [ticketCount, setTicketCount] = useState(data.ticketCount)
  const [keyCount, setKeyCount] = useState(data.keyCount)

  useEffect(() => {
    if (open) {
      setAutoRecharge(data.autoRecharge)
      setTicketCount(data.ticketCount)
      setKeyCount(data.keyCount)
    }
  }, [open, data])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ autoRecharge, ticketCount: Math.max(ticketCount, 0), keyCount: Math.max(keyCount, 0) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`${characterName}의 위젯 설정`} className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground">자동 충전</h3>
            <div className="group relative flex">
              <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-60 rounded-md border border-border bg-card p-2.5 text-xs leading-relaxed text-muted-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              >
                매주 초기화 시점에 천상 도전 티켓은 5개로 설정되고, 열쇠는 3개가 추가됩니다.
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={autoRecharge}
            aria-label="자동 충전"
            onClick={() => setAutoRecharge((prev) => !prev)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              autoRecharge ? 'bg-primary' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                autoRecharge && 'translate-x-5',
              )}
            />
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label htmlFor="paradise-ticket-count" className="text-sm font-medium text-foreground">
              티켓 수량
            </label>
            <input
              id="paradise-ticket-count"
              type="number"
              min={0}
              value={ticketCount}
              onChange={(event) => setTicketCount(Math.max(Number(event.target.value), 0))}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <label htmlFor="paradise-key-count" className="text-sm font-medium text-foreground">
              열쇠 수량
            </label>
            <input
              id="paradise-key-count"
              type="number"
              min={0}
              value={keyCount}
              onChange={(event) => setKeyCount(Math.max(Number(event.target.value), 0))}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
            />
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
