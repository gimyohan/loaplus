import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import ebonyCubeRewardsData from '@/data/ebonyCubeRewards.json'
import type { EbonyCubeSummary, TicketType } from '@/types/ebonyCube'

const TICKET_TIERS = ebonyCubeRewardsData.tiers as { ticketType: TicketType; label: string }[]

export interface EbonyCubeSettingsModalProps {
  open: boolean
  onClose: () => void
  characterName: string
  data: EbonyCubeSummary
  /** 값이 바뀐 등급만 { ticketType: delta } 형태로 전달한다 — 서버가 delta 방식이기 때문이다 */
  onSave: (deltas: Partial<Record<TicketType, number>>) => void
}

/**
 * 에브니 큐브 위젯의 톱니바퀴를 누르면 뜨는 설정 모달. 등급별 입장권 보유 수량을 직접 조절한다
 * (docs/widgets.typ 참고). 서버 엔드포인트(`PATCH .../ebony-cube/tickets/{ticketType}`)는
 * 등급 하나씩 delta로만 받으므로, 여기서는 절대값을 입력받고 저장 시점에 원래 값과의 차이를
 * 계산해 바뀐 등급만 넘긴다.
 */
export function EbonyCubeSettingsModal({ open, onClose, characterName, data, onSave }: EbonyCubeSettingsModalProps) {
  const [counts, setCounts] = useState<Record<TicketType, number>>(data.tickets)

  useEffect(() => {
    if (open) setCounts(data.tickets)
  }, [open, data])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const deltas: Partial<Record<TicketType, number>> = {}
    for (const tier of TICKET_TIERS) {
      const delta = counts[tier.ticketType] - data.tickets[tier.ticketType]
      if (delta !== 0) deltas[tier.ticketType] = delta
    }
    onSave(deltas)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`${characterName}의 에브니 큐브 설정`} className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">등급별 입장권 수량</h3>
          <div className="flex flex-col gap-2">
            {TICKET_TIERS.map((tier) => (
              <div key={tier.ticketType} className="flex items-center justify-between gap-3">
                <label htmlFor={`ebony-cube-ticket-${tier.ticketType}`} className="text-sm text-foreground">
                  {tier.label}
                </label>
                <input
                  id={`ebony-cube-ticket-${tier.ticketType}`}
                  type="number"
                  min={0}
                  value={counts[tier.ticketType]}
                  onChange={(event) =>
                    setCounts((prev) => ({
                      ...prev,
                      [tier.ticketType]: Math.max(0, Math.trunc(Number(event.target.value) || 0)),
                    }))
                  }
                  className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground"
                />
              </div>
            ))}
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
