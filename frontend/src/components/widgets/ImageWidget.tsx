import { ImagePlus, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { cn } from '@/lib/utils'

export interface ImageWidgetProps {
  url: string | null
  onChangeUrl?: (url: string | null) => void
  className?: string
}

/**
 * 이미지 위젯 — 카드 안 행 하나를 이미지로 채운다(높이는 S/M/L, lib/widgetCatalog.ts). URL이 없으면
 * 바로 입력 폼을, 있으면 이미지와 마우스를 올렸을 때 보이는 수정 버튼을 보여준다.
 */
export function ImageWidget({ url, onChangeUrl, className }: ImageWidgetProps) {
  const [isEditing, setIsEditing] = useState(!url)
  const [draftUrl, setDraftUrl] = useState(url ?? '')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = draftUrl.trim()
    onChangeUrl?.(trimmed || null)
    setIsEditing(false)
  }

  return (
    <div className={cn('h-full w-full p-2', className)}>
      {isEditing ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4">
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
          <form onSubmit={handleSubmit} className="flex w-full max-w-[260px] gap-1.5">
            <input
              type="text"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              placeholder="https://… 이미지 주소"
              className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="submit"
              className="h-7 shrink-0 rounded-md bg-secondary-strong px-2.5 text-xs font-bold text-secondary-foreground transition-colors hover:bg-secondary-strong/90"
            >
              적용
            </button>
          </form>
        </div>
      ) : (
        <div className="group/image relative h-full overflow-hidden rounded-lg">
          <img src={url!} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            aria-label="이미지 수정"
            onClick={() => {
              setDraftUrl(url ?? '')
              setIsEditing(true)
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover/image:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
