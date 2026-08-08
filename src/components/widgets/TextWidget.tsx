import type { ChangeEvent } from 'react'

import { cn } from '@/lib/utils'

const DEFAULT_PLACEHOLDER = '텍스트를 입력하세요'

export interface TextWidgetProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * 사용자가 자유롭게 문자열을 작성하는 텍스트 위젯 (docs/widgets.typ 참고).
 * 입력 길이가 영역을 넘어가면 말줄임표(...)로 잘라서 보여준다.
 */
export function TextWidget({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  className,
}: TextWidgetProps) {
  return (
    <div
      className={cn(
        'flex aspect-[5/1] items-center overflow-hidden rounded-xl border border-border bg-card px-5 shadow-lg',
        className,
      )}
    >
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
        className="w-full min-w-0 truncate bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  )
}
