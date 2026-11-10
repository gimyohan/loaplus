import { Check, Settings } from 'lucide-react'
import type { ComponentType, KeyboardEvent, MouseEvent, ReactNode } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// 카드 안 "행" 위젯들이 함께 쓰는 조각들(docs/ui_redesign.md "위젯 행 디자인"). 위젯마다 자기 박스를
// 갖지 않고 카드 한 면 위에서 얇은 구분선으로 나뉘는 행으로 그린다 — 제목 15px 굵게, 보조 정보
// 12~13px, 아이콘 버튼 28px.

/** 행 하나의 기본 여백. 위젯들이 같은 리듬으로 쌓이도록 전부 이 값을 쓴다. */
export const ROW_PADDING_CLASSNAME = 'px-3 py-2'

export function RowCheckbox({
  checked,
  disabled = false,
  onChange,
  label,
  flashing = false,
}: {
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
  label: string
  /** true면 빨갛게 깜빡여 경고한다(예: 수확 전 공명비약 사용). */
  flashing?: boolean
}) {
  return (
    <label
      className="relative flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center"
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        aria-label={label}
        className={cn(
          'peer h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-[5px] border border-foreground/30 bg-transparent transition-colors checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-40',
          flashing && 'animate-flash-warning',
        )}
      />
      <Check className="pointer-events-none absolute h-3 w-3 text-primary-foreground opacity-0 peer-checked:opacity-100" strokeWidth={3} />
    </label>
  )
}

/** 행 오른쪽 끝의 설정(톱니바퀴) 버튼. 행 전체 클릭(토글 등)으로 번지지 않게 막는다. */
export function RowSettingsButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-white/[0.06] hover:text-foreground"
    >
      <Settings className="h-[15px] w-[15px]" />
    </button>
  )
}

/** 빠른 동작용 작은 아이콘 버튼(툴팁에 이름). */
export function RowIconButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          onClick?.()
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}

/**
 * 행 안에서 "누르면 토글"되는 영역. 체크박스를 정확히 누르지 않아도 제목·게이지 쪽을 눌러 토글되게
 * 하던 기존 동작(가디언/쿠르잔/할의 모래시계/루틴)을 그대로 유지한다.
 */
export function ToggleArea({
  disabled = false,
  onToggle,
  className,
  children,
}: {
  disabled?: boolean
  onToggle: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={(event: MouseEvent) => {
        if (!disabled) onToggle()
        event.stopPropagation()
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className={cn('flex min-w-0 items-center gap-2.5', !disabled && 'cursor-pointer', className)}
    >
      {children}
    </div>
  )
}

/** 행 제목. 완료되면 흐리게 + 취소선(기존 위젯과 같은 규칙). */
export function RowTitle({ children, done = false, className }: { children: ReactNode; done?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'min-w-0 truncate text-[15px] font-bold text-foreground',
        done && 'font-normal text-muted-foreground line-through decoration-1',
        className,
      )}
    >
      {children}
    </span>
  )
}
