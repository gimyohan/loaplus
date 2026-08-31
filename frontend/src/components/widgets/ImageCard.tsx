import { ImageWidget } from '@/components/widgets/ImageWidget'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function ImageCard({ width, height, disabledClassName, className, customData, onCustomDataChange }: WidgetCardProps) {
  const url = (customData?.url as string | null) ?? null
  // 이미지는 가로·세로 둘 다 자유롭게 고를 수 있어(widgetCatalog.ts) ScaleToFit을 쓰지 않는다 —
  // 실제 사진은 ImageWidget 내부의 object-cover가 어떤 비율에도 알아서 맞춰주고, URL 입력 폼의
  // 아이콘/버튼도 text처럼 크기와 무관하게 고정 크기를 유지해야 자연스럽다.
  return (
    <div style={{ width, height }} className={cn('select-none', disabledClassName, className)}>
      <ImageWidget url={url} onChangeUrl={(nextUrl) => onCustomDataChange?.({ url: nextUrl })} className="h-full w-full" />
    </div>
  )
}
