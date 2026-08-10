import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface ScaleToFitProps {
  /** 축소 전 원본(디자인 기준) 가로/세로 크기 */
  nativeWidth: number
  nativeHeight: number
  /** 실제로 배치될 크기. scale = width / nativeWidth 로 계산되어 모든 비율이 그대로 유지된다 */
  width: number
  height: number
  className?: string
  children: ReactNode
}

/**
 * children을 nativeWidth x nativeHeight 크기로 그대로 렌더링한 뒤 통째로 scale하여
 * 목표 크기(width x height)에 맞춘다. 요소마다 개별적으로 크기를 조절하지 않으므로
 * 폰트/여백/아이콘 등 모든 비율이 원본과 완전히 동일하게 유지된다.
 */
export function ScaleToFit({
  nativeWidth,
  nativeHeight,
  width,
  height,
  className,
  children,
}: ScaleToFitProps) {
  const scale = width / nativeWidth

  return (
    <div className={cn('overflow-hidden', className)} style={{ width, height }}>
      <div
        style={{
          width: nativeWidth,
          height: nativeHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
