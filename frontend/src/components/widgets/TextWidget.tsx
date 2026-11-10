import type { ChangeEvent } from 'react'

import { ROW_PADDING_CLASSNAME } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'

const DEFAULT_PLACEHOLDER = '텍스트를 입력하세요'

export interface TextWidgetProps {
  value: string
  onChange?: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
}

/** 텍스트 위젯 — 카드 안 행 하나에서 바로 입력한다(포커스를 잃을 때 저장, TextCard 참고). */
export function TextWidget({ value, onChange, onBlur, placeholder = DEFAULT_PLACEHOLDER, className }: TextWidgetProps) {
  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex items-center', className)}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
        onBlur={() => onBlur?.()}
        className="h-7 w-full min-w-0 truncate rounded-md bg-transparent px-1 text-[15px] text-foreground placeholder:text-muted-foreground hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
      />
    </div>
  )
}
