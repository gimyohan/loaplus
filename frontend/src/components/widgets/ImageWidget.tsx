import { ImagePlus, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { cn } from '@/lib/utils'

export interface ImageWidgetProps {
  url: string | null
  onChangeUrl?: (url: string | null) => void
  className?: string
}

/**
 * 외부 이미지 URL을 입력해 프레임을 채우는 위젯 (docs/widgets.typ 참고).
 * URL이 없으면 입력 폼을, 있으면 이미지를 채워 보여주고 호버 시 수정 버튼을 노출한다.
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

  if (isEditing) {
    return (
      <div
        className={cn(
          'flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-4 shadow-lg',
          className,
        )}
      >
        <ImagePlus className="h-6 w-6 text-muted-foreground" />
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
          <input
            type="text"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            placeholder="이미지 URL"
            className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            className="rounded-md bg-primary-strong px-2 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-strong/90"
          >
            적용
          </button>
        </form>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      <img src={url!} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        aria-label="이미지 수정"
        onClick={() => {
          setDraftUrl(url ?? '')
          setIsEditing(true)
        }}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
