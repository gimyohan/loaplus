import { Banknote, Key, Settings, Ticket } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import type { ParadiseSummary } from '@/types/paradise'

// 경고 점멸 지속 시간(ms). index.css의 flash-warning-text 애니메이션(0.4s * 3회)과 맞춘다
const WARNING_DURATION_MS = 1200

export interface ParadiseWidgetProps {
  data: ParadiseSummary
  /** 티켓 영역 클릭(1개 소모) */
  onDecrementTicket?: () => void
  /** 열쇠 영역 클릭(1개 소모) */
  onDecrementKey?: () => void
  /** 귀속골드 획득 버튼 클릭 — 낙원은 귀속골드만 지급한다(docs/statistics.typ 참고) */
  onOpenGoldReward?: () => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 낙원(Paradise) 위젯. 주간 컨텐츠인 천상 스택(티켓)과 지옥 열쇠 보유 현황을 보여준다
 * (docs/widgets.typ 참고). 각 영역은 버튼으로, 클릭할 때마다 수량이 1개씩 줄어들고
 * 이미 0인 상태에서 누르면 숫자가 빨갛게 점멸해 더 줄지 않음을 알린다.
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

  const [isTicketWarningActive, setIsTicketWarningActive] = useState(false)
  const [isKeyWarningActive, setIsKeyWarningActive] = useState(false)
  const ticketWarningTimeoutRef = useRef<number | undefined>(undefined)
  const keyWarningTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => {
      window.clearTimeout(ticketWarningTimeoutRef.current)
      window.clearTimeout(keyWarningTimeoutRef.current)
    }
  }, [])

  const handleTicketClick = () => {
    if (ticketCount <= 0) {
      window.clearTimeout(ticketWarningTimeoutRef.current)
      setIsTicketWarningActive(true)
      ticketWarningTimeoutRef.current = window.setTimeout(() => setIsTicketWarningActive(false), WARNING_DURATION_MS)
      return
    }

    onDecrementTicket?.()
  }

  const handleKeyClick = () => {
    if (keyCount <= 0) {
      window.clearTimeout(keyWarningTimeoutRef.current)
      setIsKeyWarningActive(true)
      keyWarningTimeoutRef.current = window.setTimeout(() => setIsKeyWarningActive(false), WARNING_DURATION_MS)
      return
    }

    onDecrementKey?.()
  }

  return (
    <div
      className={cn(
        'relative flex aspect-[5/2] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 위젯 이름 / 옵션. 체크박스가 없는 대신 빈 스페이서로 제목을 가운데 맞춘다 */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="h-6 w-6 shrink-0" aria-hidden="true" />

        <h3 className="min-w-0 flex-1 truncate text-center text-2xl font-semibold text-foreground">
          낙원
        </h3>

        <button
          type="button"
          aria-label="낙원 설정"
          onClick={onOpenSettings}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 하단: 티켓 / 열쇠 보유 현황 / 귀속골드 획득 기록. 티켓 : 열쇠 : 골드 = 2 : 1 : 1 비율 */}
      <div className="grid flex-1 grid-cols-[2fr_1fr_1fr] divide-x divide-border">
        <button
          type="button"
          aria-label="티켓 사용"
          onClick={handleTicketClick}
          className="flex items-center justify-center gap-2 text-foreground transition-colors hover:bg-muted"
        >
          <Ticket className="h-[1.875rem] w-[1.875rem] shrink-0 text-primary" />
          <span
            className={cn(
              'font-mono text-3xl font-bold',
              isTicketWarningActive && 'animate-flash-warning-text',
            )}
          >
            {ticketCount}
          </span>
        </button>

        <button
          type="button"
          aria-label="열쇠 사용"
          onClick={handleKeyClick}
          className="flex items-center justify-center gap-2 text-foreground transition-colors hover:bg-muted"
        >
          <Key className="h-[1.875rem] w-[1.875rem] shrink-0 text-secondary" />
          <span
            className={cn(
              'font-mono text-3xl font-bold',
              isKeyWarningActive && 'animate-flash-warning-text',
            )}
          >
            {keyCount}
          </span>
        </button>

        {/* 낙원은 귀속골드만 지급하므로(docs/statistics.typ) 여기서 기록하는 값도 귀속골드뿐이다. */}
        <button
          type="button"
          aria-label="귀속골드 획득 기록"
          onClick={onOpenGoldReward}
          className="flex items-center justify-center bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Banknote className="h-[1.875rem] w-[1.875rem] shrink-0" />
        </button>
      </div>
    </div>
  )
}
