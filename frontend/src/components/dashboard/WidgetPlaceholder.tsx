import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

export interface WidgetPlaceholderProps {
  /** 위젯 목록(WIDGET_CATALOG)의 표시 이름 */
  label: string
  /** 그리드 칸 수(가로×세로 텍스트로 표시) */
  w: number
  h: number
  className?: string
  style?: CSSProperties
}

/**
 * 실제 위젯(캐릭터 데이터)을 그리지 않고 이름과 그리드 크기만 보여주는 자리표시자.
 * 위젯 목록(WidgetPalette)과 배치 편집 그리드(WidgetDashboard의 "위젯 설정" 모달, 이미 놓인
 * 위젯도 편집 중엔 실제 데이터로 그리지 않는다) 양쪽에서 공유해서 쓴다.
 */
export function WidgetPlaceholder({ label, w, h, className, style }: WidgetPlaceholderProps) {
  return (
    <div
      style={style}
      className={cn(
        // select-none: 배치 편집 그리드에서 이 이름/크기 텍스트가 드래그 가능한 상태로 있으면,
        // 위젯을 옮기려고 누른 지점이 텍스트 위일 때 우리 포인터 드래그 대신 브라우저의 텍스트
        // 선택 드래그가 걸려버리는 경우가 있었다.
        'select-none flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-muted/40 p-1 text-center',
        className,
      )}
    >
      <span className="px-1 text-xs font-medium leading-tight text-foreground">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {w}×{h}
      </span>
    </div>
  )
}
