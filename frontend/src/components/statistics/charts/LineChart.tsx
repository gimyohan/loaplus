import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export interface LineChartSeries {
  key: string
  label: string
  /** rgb(var(--chart-N)) 형태의 CSS color 문자열 */
  color: string
}

export interface LineChartPoint {
  /** x축에 표시할 라벨(예: "8/14") */
  label: string
  values: Record<string, number>
  /** 선으로는 그리지 않지만(축척 계산에도 포함되지 않음) 호버 툴팁에는 추가로 보여줄 값
   * (예: 거래량) — key는 extraFields의 key와 매칭된다. */
  extraValues?: Record<string, number>
}

export interface LineChartExtraField {
  key: string
  label: string
  /** 생략하면 formatValue를 그대로 쓴다 — 거래량처럼 단위가 다른 값에 쓴다. */
  format?: (value: number) => string
}

export interface LineChartProps {
  series: LineChartSeries[]
  points: LineChartPoint[]
  formatValue: (value: number) => string
  height?: number
  /** 툴팁에만 표시할 추가 필드(선 그래프에는 나타나지 않음). */
  extraFields?: LineChartExtraField[]
}

const VIEW_WIDTH = 800
const PADDING = { top: 16, right: 16, bottom: 28, left: 64 }

/** 0/최댓값 사이를 보기 좋은 눈금 4개로 나눈다(0, 1000, 2000... 처럼 딱 떨어지는 값). */
function niceMax(rawMax: number): number {
  if (rawMax <= 0) return 4
  const magnitude = 10 ** Math.floor(Math.log10(rawMax))
  const normalized = rawMax / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 4 ? 4 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** 주간 골드/귀속골드/합계 추이 다중 선 그래프 — 최대 3개 시리즈, 호버 시 크로스헤어+툴팁. */
export function LineChart({ series, points, formatValue, height = 280, extraFields = [] }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right
  const plotHeight = height - PADDING.top - PADDING.bottom

  // extraValues(예: 거래량)는 선으로 그리지 않으므로 축척(y 최댓값) 계산에서 제외한다 — series
  // 키만 순회해야 한다(전체 values를 순회하면 extraValues 쪽 값이 훨씬 커서 축이 깨진다).
  const maxValue = useMemo(() => {
    let max = 0
    for (const point of points) {
      for (const s of series) {
        const series_ = point.values[s.key] ?? 0
        if (series_ > max) max = series_
      }
    }
    return niceMax(max)
  }, [points, series])

  const xFor = (index: number) => {
    if (points.length <= 1) return PADDING.left + plotWidth / 2
    return PADDING.left + (plotWidth * index) / (points.length - 1)
  }
  const yFor = (value: number) => PADDING.top + plotHeight - (plotHeight * value) / maxValue

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxValue * t))

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (points.length === 0 || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scale = VIEW_WIDTH / rect.width
    const localX = (event.clientX - rect.left) * scale
    const ratio = points.length <= 1 ? 0 : (localX - PADDING.left) / plotWidth
    const index = Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1))))
    setHoverIndex(index)
  }

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        표시할 주간 데이터가 없습니다
      </div>
    )
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const tooltipLeftSide = hoverIndex !== null && hoverIndex > points.length / 2

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
          className="w-full touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {/* 가로 그리드라인 + y축 눈금 라벨 */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={VIEW_WIDTH - PADDING.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={yFor(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {/* x축 라벨 — 12개 넘게 촘촘하면 일부만 표시 */}
          {points.map((point, index) => {
            const step = points.length > 10 ? Math.ceil(points.length / 8) : 1
            if (index % step !== 0 && index !== points.length - 1) return null
            return (
              <text
                key={point.label + index}
                x={xFor(index)}
                y={height - PADDING.bottom + 18}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {point.label}
              </text>
            )
          })}

          {/* 시리즈별 꺾은선 */}
          {series.map((s) => {
            const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.values[s.key] ?? 0)}`).join(' ')
            return (
              <path key={s.key} d={path} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )
          })}

          {/* 각 시리즈 끝점 마커(≥8px = r 4) */}
          {series.map((s) => {
            const lastPoint = points[points.length - 1]
            if (!lastPoint) return null
            return (
              <circle
                key={s.key}
                cx={xFor(points.length - 1)}
                cy={yFor(lastPoint.values[s.key] ?? 0)}
                r={4}
                fill={s.color}
                stroke="rgb(var(--card))"
                strokeWidth={2}
              />
            )
          })}

          {/* 호버 크로스헤어 */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={xFor(hoverIndex)}
                x2={xFor(hoverIndex)}
                y1={PADDING.top}
                y2={height - PADDING.bottom}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
              />
              {series.map((s) => (
                <circle
                  key={s.key}
                  cx={xFor(hoverIndex)}
                  cy={yFor(points[hoverIndex]!.values[s.key] ?? 0)}
                  r={4}
                  fill={s.color}
                  stroke="rgb(var(--card))"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>

        {hovered && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-2 flex min-w-[140px] flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(xFor(hoverIndex) / VIEW_WIDTH) * 100}%`,
              transform: tooltipLeftSide ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
            }}
          >
            <span className="font-medium text-foreground">{hovered.label}</span>
            {series.map((s) => (
              <span key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono font-semibold text-foreground">{formatValue(hovered.values[s.key] ?? 0)}</span>
              </span>
            ))}
            {extraFields.map((field) => (
              <span key={field.key} className="flex items-center justify-between gap-3 border-t border-border pt-1">
                <span className="text-muted-foreground">{field.label}</span>
                <span className="font-mono font-semibold text-foreground">
                  {(field.format ?? formatValue)(hovered.extraValues?.[field.key] ?? 0)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
