import { ChevronLeft, ChevronRight } from 'lucide-react'

import { ROW_PADDING_CLASSNAME, RowSettingsButton, RowTitle } from '@/components/widgets/rowParts'
import ebonyCubeRewardsData from '@/data/ebonyCubeRewards.json'
import { cn } from '@/lib/utils'
import type { EbonyCubeSummary, TicketType } from '@/types/ebonyCube'

const TICKET_LABELS: Record<TicketType, string> = Object.fromEntries(
  ebonyCubeRewardsData.tiers.map((tier) => [tier.ticketType, tier.label]),
) as Record<TicketType, string>

const TICKET_ORDER: TicketType[] = ebonyCubeRewardsData.tiers.map((tier) => tier.ticketType) as TicketType[]

export interface EbonyCubeWidgetProps {
  data: EbonyCubeSummary
  /** 좌우 화살표로 대상 등급 이동(수량이 있는 등급만, 순환하지 않음) */
  onCycleTarget?: (direction: 'prev' | 'next') => void
  /** 선택한 등급 입장권으로 1회/3회 클리어 */
  onClear?: (times: 1 | 3) => void
  onOpenSettings?: () => void
  className?: string
}

const arrowClassName =
  'flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30'
const clearButtonClassName =
  'h-7 shrink-0 rounded-md border border-foreground/25 px-2 text-xs font-bold text-foreground transition-colors hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-35'

/**
 * 에브니 큐브 위젯 — 카드 안 행 하나. 윗줄은 이름·설정, 아랫줄은 대상 등급 선택(좌우 화살표, 수량이
 * 있는 등급만, 양 끝에서 비활성화)·보유 수·1회/3회 클리어다. 이전/다음 등급 이름은 화살표의 툴팁과
 * 접근성 이름으로 알려준다(예전 박스에선 화살표 바깥에 흐리게 보였던 정보).
 */
export function EbonyCubeWidget({ data, onCycleTarget, onClear, onOpenSettings, className }: EbonyCubeWidgetProps) {
  const { selectedTicketType, tickets } = data
  const availableTypes = TICKET_ORDER.filter((ticketType) => tickets[ticketType] > 0)
  const selectedCount = selectedTicketType ? tickets[selectedTicketType] : 0

  const selectedIndex = selectedTicketType ? availableTypes.indexOf(selectedTicketType) : -1
  const canPrev = selectedIndex > 0
  const canNext = selectedIndex !== -1 && selectedIndex < availableTypes.length - 1
  const prevLabel = canPrev ? TICKET_LABELS[availableTypes[selectedIndex - 1]!] : null
  const nextLabel = canNext ? TICKET_LABELS[availableTypes[selectedIndex + 1]!] : null

  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <RowTitle className="flex-1">에브니 큐브</RowTitle>
        <RowSettingsButton label="에브니 큐브 설정" onClick={onOpenSettings} />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={prevLabel ? `이전 등급: ${prevLabel}` : '이전 등급'}
          title={prevLabel ?? undefined}
          disabled={!canPrev}
          onClick={() => onCycleTarget?.('prev')}
          className={arrowClassName}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {selectedTicketType ? (
          <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
            <span className="truncate text-[13px] text-foreground">{TICKET_LABELS[selectedTicketType]}</span>
            <span className="shrink-0 font-mono text-xs text-secondary">×{selectedCount}</span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">입장권이 없습니다</span>
        )}
        <button
          type="button"
          aria-label={nextLabel ? `다음 등급: ${nextLabel}` : '다음 등급'}
          title={nextLabel ?? undefined}
          disabled={!canNext}
          onClick={() => onCycleTarget?.('next')}
          className={arrowClassName}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!selectedTicketType || selectedCount < 1}
          onClick={() => onClear?.(1)}
          className={cn(clearButtonClassName, 'ml-1')}
        >
          1회 클리어
        </button>
        <button
          type="button"
          disabled={!selectedTicketType || selectedCount < 3}
          onClick={() => onClear?.(3)}
          className={clearButtonClassName}
        >
          3회 클리어
        </button>
      </div>
    </div>
  )
}
