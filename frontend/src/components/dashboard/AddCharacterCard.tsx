import { Plus } from 'lucide-react'

import { CARD_WIDTH } from '@/lib/widgetCatalog'
import { cn } from '@/lib/utils'

export interface AddCharacterCardProps {
  onClick: () => void
  /** 생략하면 CARD_WIDTH(350px). */
  width?: number
  className?: string
}

/** 카드 목록/캐러셀 끝에서 새 카드가 추가될 자리를 보여주는 타일. 실제 카드와 같은 폭이다. */
export function AddCharacterCard({ onClick, width = CARD_WIDTH, className }: AddCharacterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ width }}
      className={cn(
        'flex h-64 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary',
        className,
      )}
    >
      <Plus className="h-8 w-8" />
      <span className="text-sm font-bold">캐릭터 추가</span>
    </button>
  )
}
