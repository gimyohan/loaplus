import { Plus } from 'lucide-react'

import { CARD_NATIVE_HEIGHT, CARD_NATIVE_WIDTH } from '@/components/dashboard/DashboardCard'
import { cn } from '@/lib/utils'

export interface AddCharacterCardProps {
  onClick: () => void
  /** 생략하면 카드 원본 비율은 유지한 채 부모 너비를 그대로 채운다(w-full). */
  width?: number
  className?: string
}

/**
 * 카드 그리드/캐러셀에서 새 카드가 추가될 자리를 미리 보여주는 타일. 실제 카드와 같은 비율
 * (DashboardCard의 세로 칸 수 기준 기본 높이)로 맞춰서, 같은 줄에 나란히 놓여도 크기가 자연스럽다.
 */
export function AddCharacterCard({ onClick, width, className }: AddCharacterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width, aspectRatio: `${CARD_NATIVE_WIDTH} / ${CARD_NATIVE_HEIGHT}` }}
      className={cn(
        'flex shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary',
        !width && 'w-full',
        className,
      )}
    >
      <Plus className="h-8 w-8" />
      <span className="text-sm font-medium">Add Character</span>
    </button>
  )
}
