import { useState } from 'react'

export interface PieSlice {
  key: string
  label: string
  value: number
  color: string
}

export interface PieChartProps {
  slices: PieSlice[]
  formatValue: (value: number) => string
  size?: number
}

const RADIUS = 90
const CENTER = 100

function arcPoint(angle: number) {
  return { x: CENTER + RADIUS * Math.sin(angle), y: CENTER - RADIUS * Math.cos(angle) }
}

/**
 * 컨텐츠별 골드 분포 파이 차트. 슬라이스 각도는 항상 GOLD_CATEGORIES 고정 순서(값 크기순이 아님)로
 * 12시 방향부터 시계 방향 배치 — "전체"/"특정 캐릭터" 두 파이가 나란히 있을 때 같은 카테고리가
 * 항상 같은 자리·색이라 비교하기 쉽다. 범례는 항상 값·비율을 직접 보여준다(파이의 밝은 슬롯이
 * 카드 배경 대비 3:1 미만이라 색만으로 구분하지 않기 위함).
 */
export function PieChart({ slices, formatValue, size = 200 }: PieChartProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          className="rounded-full border-2 border-dashed border-border"
          style={{ width: size * 0.7, height: size * 0.7 }}
        />
        <p className="text-sm text-muted-foreground">데이터가 없습니다</p>
      </div>
    )
  }

  let cursor = 0
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const startAngle = (cursor / total) * Math.PI * 2
      cursor += s.value
      const endAngle = (cursor / total) * Math.PI * 2
      const ratio = s.value / total
      const start = arcPoint(startAngle)
      const end = arcPoint(endAngle)
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
      const midAngle = (startAngle + endAngle) / 2
      const labelPoint = { x: CENTER + RADIUS * 0.65 * Math.sin(midAngle), y: CENTER - RADIUS * 0.65 * Math.cos(midAngle) }
      return { ...s, ratio, start, end, largeArc, labelPoint }
    })

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 200 200" style={{ width: size, height: size }}>
        {arcs.map((arc) => (
          <g key={arc.key} className="transition-opacity" style={{ opacity: hoverKey && hoverKey !== arc.key ? 0.35 : 1 }}>
            {/* 슬라이스가 하나뿐이면(=100%) start/end 각도가 0°/360°로 같은 좌표에 겹쳐 arc(A)
                커맨드가 길이 0짜리로 접혀 아무것도 안 그려진다 — 이 경우만 원(circle)으로 그린다. */}
            {arcs.length === 1 ? (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill={arc.color}
                onPointerEnter={() => setHoverKey(arc.key)}
                onPointerLeave={() => setHoverKey(null)}
              >
                <title>{`${arc.label}: ${formatValue(arc.value)} (${(arc.ratio * 100).toFixed(1)}%)`}</title>
              </circle>
            ) : (
              <path
                d={`M ${CENTER} ${CENTER} L ${arc.start.x} ${arc.start.y} A ${RADIUS} ${RADIUS} 0 ${arc.largeArc} 1 ${arc.end.x} ${arc.end.y} Z`}
                fill={arc.color}
                onPointerEnter={() => setHoverKey(arc.key)}
                onPointerLeave={() => setHoverKey(null)}
              >
                <title>{`${arc.label}: ${formatValue(arc.value)} (${(arc.ratio * 100).toFixed(1)}%)`}</title>
              </path>
            )}
            {arc.ratio >= 0.08 && (
              <text
                x={arc.labelPoint.x}
                y={arc.labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-white text-[11px] font-semibold"
              >
                {(arc.ratio * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="flex w-full flex-col gap-1.5">
        {slices.map((s) => {
          const ratio = total > 0 ? s.value / total : 0
          return (
            <button
              key={s.key}
              type="button"
              onPointerEnter={() => setHoverKey(s.key)}
              onPointerLeave={() => setHoverKey(null)}
              className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted"
              style={{ opacity: hoverKey && hoverKey !== s.key ? 0.5 : 1 }}
            >
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="flex items-center gap-2 font-mono">
                <span className="text-foreground">{formatValue(s.value)}</span>
                <span className="w-10 text-right text-muted-foreground">{(ratio * 100).toFixed(1)}%</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
