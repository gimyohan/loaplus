import { Gem } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface AbilityStoneWidgetProps {
  onOpen?: () => void
  className?: string
}

/**
 * 아이콘 하나뿐인 위젯. 다른 위젯과 달리 그리드 칸 안에 상태를 직접 보여주지 않고, 누르면
 * 실제 세공 전략 도구가 모달로 뜬다(AbilityStoneModal 참고) — 세공 상태 자체가 캐릭터에
 * 종속되지 않는 순수 계산기라, 위젯은 그 계산기로 들어가는 입구 역할만 한다.
 */
export function AbilityStoneWidget({ onOpen, className }: AbilityStoneWidgetProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="어빌리티 스톤 세공 전략"
      className={cn(
        'flex h-full w-full items-center justify-center rounded-lg border border-border bg-white/[0.03] transition-colors hover:border-foreground/30',
        className,
      )}
    >
      <Gem className="h-[55%] w-[55%] text-primary" />
    </button>
  )
}
