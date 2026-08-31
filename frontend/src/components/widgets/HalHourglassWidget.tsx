import { Check, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { HalHourglassSummary } from '@/types/halHourglass'

const MAX_SAND_STACK = 5

export interface HalHourglassWidgetProps {
  data: HalHourglassSummary
  /** 주간 완료 체크박스 토글 */
  onToggleCompleted?: (checked: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 할의 모래시계(Hal's Hourglass) 위젯. 혼돈의 균열 보상(시련의 모래)과 주간 입장권으로 참여하는
 * 주 1회 컨텐츠다(docs/widgets.typ 참고). 5칸 인디케이터가 시련의 모래 스택만큼 채워지며, 완료
 * 체크박스는 그 시점 스택 수(N)에 따라 (N+1)배 보상을 지급하고 스택을 소진한다. 스택은 쿠르잔
 * 전선 위젯의 티켓 클릭(목표가 혼돈의 균열 구간일 때)과 설정 모달의 수동 조절로만 늘어난다 —
 * 이 위젯 자체에는 획득 클릭 요소가 없다(사용자 확인).
 */
export function HalHourglassWidget({ data, onToggleCompleted, onOpenSettings, className }: HalHourglassWidgetProps) {
  const { level, sandStack, isCompleted } = data

  return (
    <div
      className={cn(
        'flex aspect-[5/2] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 완료 체크박스 / 레벨(목표) / 설정. 체크박스 자체 외에 이 블럭 전체(목표 박스 포함)를
          눌러도 토글되도록 해 매번 체크박스를 정확히 클릭해야 하는 번거로움을 줄인다 — 가디언/
          쿠르잔 전선 위젯과 동일한 패턴(GuardianWidget.tsx 참고, 사용자 확인). */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggleCompleted?.(!isCompleted)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleCompleted?.(!isCompleted)
          }
        }}
        className="flex cursor-pointer items-center justify-between gap-3 border-b border-border px-5 py-2.5 transition-colors hover:bg-muted/50"
      >
        <label
          className="relative flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(event) => onToggleCompleted?.(event.target.checked)}
            aria-label="주간 완료 여부"
            className="peer h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-md border border-border bg-background transition-colors checked:border-primary checked:bg-primary"
          />
          <Check className="pointer-events-none absolute h-4 w-4 text-primary-foreground opacity-0 peer-checked:opacity-100" />
        </label>

        <h3
          className={cn(
            'min-w-0 flex-1 truncate text-center text-lg font-semibold text-foreground',
            isCompleted && 'text-muted-foreground line-through decoration-2',
          )}
        >
          {level}
        </h3>

        <button
          type="button"
          aria-label="할의 모래시계 설정"
          onClick={(event) => {
            event.stopPropagation()
            onOpenSettings?.()
          }}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 하단: 시련의 모래 스택(5칸) — 순수 표시 전용(클릭 요소 없음). */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <div className="flex items-center gap-2">
          {Array.from({ length: MAX_SAND_STACK }, (_, index) => (
            <span
              key={index}
              className={cn(
                'h-6 w-6 rounded-full border border-border transition-colors',
                index < sandStack ? 'border-primary bg-primary' : 'bg-background',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
