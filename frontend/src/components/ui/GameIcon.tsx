import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface GameIconProps {
  /** 공식 CDN 이미지 주소(lib/gameAssets.ts). 없거나 불러오지 못하면 fallback을 그린다. */
  src: string | null | undefined
  /** 이미지가 없거나 깨졌을 때 대신 보여줄 것(예: 지금까지 쓰던 lucide 아이콘). */
  fallback?: ReactNode
  alt?: string
  className?: string
}

/**
 * 게임 아이콘 이미지. 외부 CDN이라 경로가 바뀌거나 막히면 깨질 수 있어, 실패하면 fallback으로
 * 되돌아간다(docs/asset_cdn.md "적용할 때 생각할 점").
 */
export function GameIcon({ src, fallback = null, alt = '', className }: GameIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!src || failedSrc === src) return <>{fallback}</>
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailedSrc(src)}
      className={cn('shrink-0 object-contain', className)}
    />
  )
}
