import { clamp, cn } from '@/lib/utils'

const DEFAULT_SEGMENTS = 5

export interface RestGaugeBarProps {
  value: number
  max: number
  segments?: number
  className?: string
}

/**
 * 휴식 게이지를 세그먼트 바로 보여준다 (가디언/쿠르잔 전선 공용).
 * 값이 세그먼트 경계 사이에 걸치면(예: 5칸 중 1칸=20이지만 값이 10처럼 절반만 채워야 하는 경우)
 * 반올림으로 한 칸을 통째로 채우는 대신, 해당 칸만 절반 너비 + 옅은 색으로 채워서 실제 값을
 * 정확히 반영한다.
 */
export function RestGaugeBar({ value, max, segments = DEFAULT_SEGMENTS, className }: RestGaugeBarProps) {
  const exactSegments = (value / max) * segments

  return (
    <div className={cn('flex h-3 w-full gap-1', className)}>
      {Array.from({ length: segments }, (_, index) => {
        const fraction = clamp(exactSegments - index, 0, 1)
        return (
          <div key={index} className="relative flex-1 overflow-hidden rounded-sm bg-muted">
            {fraction > 0 && (
              <div
                className={cn(
                  'absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-secondary',
                  fraction < 1 && 'opacity-50',
                )}
                style={{ width: `${fraction * 100}%` }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
