import { Banknote, Key, Ticket } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { ROW_PADDING_CLASSNAME, RowIconButton, RowSettingsButton, RowTitle } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'
import type { ParadiseSummary } from '@/types/paradise'

// 0개인 재화를 더 쓰려 할 때 숫자를 빨갛게 깜빡이는 시간
const WARNING_DURATION_MS = 1200

export interface ParadiseWidgetProps {
  data: ParadiseSummary
  /** 티켓 1개 사용(0개면 호출되지 않고 숫자만 깜빡인다) */
  onDecrementTicket?: () => void
  /** 열쇠 1개 사용(0개면 호출되지 않고 숫자만 깜빡인다) */
  onDecrementKey?: () => void
  /** 귀속골드 획득 기록 모달 열기 */
  onOpenGoldReward?: () => void
  onOpenSettings?: () => void
  className?: string
}

function useFlash() {
  const [active, setActive] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])
  const trigger = () => {
    window.clearTimeout(timeoutRef.current)
    setActive(true)
    timeoutRef.current = window.setTimeout(() => setActive(false), WARNING_DURATION_MS)
  }
  return [active, trigger] as const
}

/** 보유 개수를 보여주고 누르면 1개 사용하는 작은 버튼(티켓/열쇠). */
function UseCountButton({
  label,
  icon: Icon,
  iconClassName,
  count,
  flashing,
  onClick,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  count: number
  flashing: boolean
  onClick: () => void
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="flex h-7 items-center gap-1 rounded-md px-1.5 transition-colors hover:bg-white/[0.06]"
      >
        <Icon className={cn('h-4 w-4 shrink-0', iconClassName)} />
        <span className={cn('min-w-[1ch] font-mono text-sm font-bold text-foreground', flashing && 'animate-flash-warning-text')}>
          {count}
        </span>
      </button>
    </Tooltip>
  )
}

/**
 * 낙원(Paradise) 위젯 — 카드 안 행 하나. 티켓/열쇠 보유 수(누르면 1개 사용, 0개면 숫자를 깜빡여
 * 경고), 귀속골드 획득 기록, 설정. 낙원은 귀속골드만 지급한다(docs/statistics.md).
 */
export function ParadiseWidget({
  data,
  onDecrementTicket,
  onDecrementKey,
  onOpenGoldReward,
  onOpenSettings,
  className,
}: ParadiseWidgetProps) {
  const { ticketCount, keyCount } = data
  const [isTicketWarningActive, flashTicket] = useFlash()
  const [isKeyWarningActive, flashKey] = useFlash()

  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex items-center gap-1', className)}>
      <RowTitle className="flex-1">낙원</RowTitle>
      <UseCountButton
        label="티켓 사용"
        icon={Ticket}
        iconClassName="text-primary"
        count={ticketCount}
        flashing={isTicketWarningActive}
        onClick={() => (ticketCount <= 0 ? flashTicket() : onDecrementTicket?.())}
      />
      <UseCountButton
        label="열쇠 사용"
        icon={Key}
        iconClassName="text-secondary"
        count={keyCount}
        flashing={isKeyWarningActive}
        onClick={() => (keyCount <= 0 ? flashKey() : onDecrementKey?.())}
      />
      <RowIconButton label="귀속골드 획득 기록" icon={Banknote} onClick={onOpenGoldReward} />
      <RowSettingsButton label="낙원 설정" onClick={onOpenSettings} />
    </div>
  )
}
