import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'

import ebonyCubeRewardsData from '@/data/ebonyCubeRewards.json'
import { cn } from '@/lib/utils'
import type { EbonyCubeSummary, TicketType } from '@/types/ebonyCube'

const TICKET_LABELS: Record<TicketType, string> = Object.fromEntries(
  ebonyCubeRewardsData.tiers.map((tier) => [tier.ticketType, tier.label]),
) as Record<TicketType, string>

// 등급 순서(제 1~4 해금) 고정값. 실제 화살표 이동 대상은 이 중 수량이 남은(>0) 등급만 걸러낸
// 목록이다 — 화살표 옆 "이전/다음 등급" 미리보기도 같은 목록을 기준으로 계산해서, 수량이 없는
// 등급은 미리보기에도 나타나지 않는다.
const TICKET_ORDER: TicketType[] = ebonyCubeRewardsData.tiers.map((tier) => tier.ticketType) as TicketType[]

export interface EbonyCubeWidgetProps {
  data: EbonyCubeSummary
  /** 좌우 화살표로 큐브 목표 등급 선택(순환하지 않음) */
  onCycleTarget?: (direction: 'prev' | 'next') => void
  /** '1회 클리어'/'3회 클리어' 버튼 */
  onClear?: (times: 1 | 3) => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 에브니 큐브(Ebony Cube) 위젯. 카오스 던전·쿠르잔 전선 보상 입장권을 소모해 4티어 보석을 얻는다
 * (docs/widgets.typ 참고). 수량이 남은 등급만 좌우 화살표로 선택하고(순환하지 않음), '1회/3회
 * 클리어'로 그 등급의 입장권을 소모해 보상을 지급한다.
 */
export function EbonyCubeWidget({ data, onCycleTarget, onClear, onOpenSettings, className }: EbonyCubeWidgetProps) {
  const { selectedTicketType, tickets } = data
  const availableTypes = TICKET_ORDER.filter((ticketType) => tickets[ticketType] > 0)
  const selectedCount = selectedTicketType ? tickets[selectedTicketType] : 0

  // 화살표는 순환하지 않는다 — 목록 양 끝에서는 그 방향으로 더 이상 갈 곳이 없으므로 비활성화한다.
  const selectedIndex = selectedTicketType ? availableTypes.indexOf(selectedTicketType) : -1
  const canPrev = selectedIndex > 0
  const canNext = selectedIndex !== -1 && selectedIndex < availableTypes.length - 1
  const prevLabel = canPrev ? TICKET_LABELS[availableTypes[selectedIndex - 1]!] : null
  const nextLabel = canNext ? TICKET_LABELS[availableTypes[selectedIndex + 1]!] : null

  return (
    <div
      className={cn(
        'flex aspect-[5/2] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 위젯 이름 / 설정. 낙원과 동일하게 빈 스페이서로 제목을 가운데 맞춘다 */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5">
        <div className="h-6 w-6 shrink-0" aria-hidden="true" />

        <h3 className="min-w-0 flex-1 truncate text-center text-lg font-semibold text-foreground">
          에브니 큐브
        </h3>

        <button
          type="button"
          aria-label="에브니 큐브 설정"
          onClick={onOpenSettings}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 중단: 좌우 화살표로 등급 선택. 수량이 있는 등급만 대상이고 순환하지 않으며(양 끝에서는
          해당 화살표가 비활성화됨), 화살표 바깥쪽에 이전/다음 등급을 흐리게 미리 보여준다. */}
      <div className="flex flex-1 items-center justify-center gap-2 px-4">
        <span className="w-14 shrink-0 truncate text-right text-xs text-muted-foreground/40">
          {prevLabel}
        </span>

        <button
          type="button"
          aria-label="이전 등급"
          disabled={!canPrev}
          onClick={() => onCycleTarget?.('prev')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {selectedTicketType ? (
          <div className="flex min-w-0 flex-col items-center gap-0.5">
            <span className="truncate text-base font-semibold text-foreground">
              {TICKET_LABELS[selectedTicketType]}
            </span>
            <span className="font-mono text-sm text-secondary">보유 {selectedCount}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">입장권이 없습니다</span>
        )}

        <button
          type="button"
          aria-label="다음 등급"
          disabled={!canNext}
          onClick={() => onCycleTarget?.('next')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <span className="w-14 shrink-0 truncate text-left text-xs text-muted-foreground/40">
          {nextLabel}
        </span>
      </div>

      {/* 하단: 1회/3회 클리어 */}
      <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-card">
        <button
          type="button"
          disabled={!selectedTicketType || selectedCount < 1}
          onClick={() => onClear?.(1)}
          className="flex flex-1 items-center justify-center py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:text-muted-foreground/50"
        >
          1회 클리어
        </button>
        <button
          type="button"
          disabled={!selectedTicketType || selectedCount < 3}
          onClick={() => onClear?.(3)}
          className="flex flex-1 items-center justify-center py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:text-muted-foreground/50"
        >
          3회 클리어
        </button>
      </div>
    </div>
  )
}
