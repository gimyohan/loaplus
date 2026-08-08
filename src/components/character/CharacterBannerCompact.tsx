import { Swords, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CLASS_ICON_MAP } from '@/lib/classIcons'
import { Button } from '@/components/ui/button'
import type { CharacterSummary } from '@/types/character'

const numberFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface CharacterBannerCompactProps {
  character: CharacterSummary
  /** Open API 재동기화 등 '새로고침' 상호작용 (docs/widgets.typ 참고) */
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

/**
 * 배너의 10x1 축소판. 한 줄에 클래스 아이콘 · 닉네임 · 전투력 · 아이템 레벨 · 새로고침만 배치한다.
 * 서버명/배경 이미지처럼 자리를 많이 차지하는 정보는 생략한다.
 */
export function CharacterBannerCompact({
  character,
  onRefresh,
  isRefreshing = false,
  className,
}: CharacterBannerCompactProps) {
  const { characterName, job, itemLevel, combatPower } = character
  const classIcon = CLASS_ICON_MAP[job]

  return (
    <div
      className={cn(
        'flex aspect-[10/1] items-center gap-3 overflow-hidden rounded-xl border border-border bg-card pl-10 shadow-lg',
        className,
      )}
    >
      {/* 클래스 아이콘 */}
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary">
        {classIcon && <img src={classIcon} alt={job} className="h-8 w-8" />}
      </div>

      {/* 캐릭터 닉네임 */}
      <span className="min-w-0 flex-1 truncate text-3xl font-extrabold tracking-tight text-foreground">
        {characterName}
      </span>

      {/* 전투력 */}
      <div className="flex shrink-0 items-center gap-2">
        <Swords className="h-7 w-7 text-primary" aria-hidden="true" />
        <span className="font-mono text-4xl font-bold leading-none text-primary">
          {numberFormatter.format(combatPower)}
        </span>
      </div>

      <div className="h-10 w-px shrink-0 bg-border" />

      {/* 아이템 레벨 */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-sm uppercase text-muted-foreground">LV.</span>
        <span className="font-mono text-4xl font-bold leading-none text-secondary">
          {numberFormatter.format(itemLevel)}
        </span>
      </div>

      {/* 새로고침 액션: 배너 전체를 9:1로 나누는 지점에 구분선을 두고, 그 안에서 버튼을 가운데 배치 */}
      <div className="flex h-full w-[10%] shrink-0 items-center justify-center border-l border-border">
        <Button
          variant="ghost"
          size="icon"
          className="group rounded-full text-muted-foreground hover:text-primary"
          aria-label="캐릭터 정보 새로고침"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={cn(
              'h-6 w-6 transition-transform duration-500 ease-in-out group-hover:rotate-180',
              isRefreshing && 'animate-spin',
            )}
          />
        </Button>
      </div>
    </div>
  )
}
