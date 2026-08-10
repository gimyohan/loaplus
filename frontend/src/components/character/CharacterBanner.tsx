import { Swords, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { CharacterSummary } from '@/types/character'

const numberFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface CharacterBannerProps {
  character: CharacterSummary
  /** Open API 재동기화 등 '새로고침' 상호작용 (docs/widgets.typ 참고) */
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

export function CharacterBanner({
  character,
  onRefresh,
  isRefreshing = false,
  className,
}: CharacterBannerProps) {
  const { imageUrl, server, characterName, job, itemLevel, combatPower } = character

  return (
    <div
      className={cn(
        'flex aspect-[10/2] items-center overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 아이덴티티 영역: 배경 이미지 + 서버/캐릭터명/직업 */}
      <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-l-xl">
        <div
          className="absolute inset-0 z-0"
          style={{ maskImage: 'linear-gradient(to right, black 40%, transparent 90%)' }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full -translate-x-[26%] object-cover object-[50%_14%] opacity-65"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-card/10 via-card/85 to-card" />
        </div>

        <div className="relative z-10 flex h-full w-full min-w-0 flex-col items-end justify-center p-4 lg:p-6">
          <div className="mb-2 flex w-full min-w-0 items-center justify-end gap-1.5 font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
            <span className="truncate">{server}</span>
            <span className="shrink-0 text-primary">/</span>
            <span className="truncate">{job}</span>
          </div>
          <h2 className="w-full min-w-0 truncate bg-gradient-to-r from-foreground to-primary bg-clip-text text-right text-4xl font-extrabold tracking-tight text-transparent drop-shadow-sm lg:text-5xl">
            {characterName}
          </h2>
        </div>
      </div>

      {/* 스탯 영역: 전투력 / 아이템 레벨 */}
      <div className="flex items-center gap-4 pr-4">
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <Swords className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-mono text-4xl font-bold leading-none text-primary">
              {numberFormatter.format(combatPower)}
            </span>
          </div>

          <div className="h-px w-full bg-border" />

          <div className="flex items-center justify-between gap-4">
            <span className="mt-1 font-mono text-sm uppercase text-muted-foreground">
              LV.
            </span>
            <span className="font-mono text-4xl font-bold leading-none text-secondary">
              {numberFormatter.format(itemLevel)}
            </span>
          </div>
        </div>
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
              'h-5 w-5 transition-transform duration-500 ease-in-out group-hover:rotate-180',
              isRefreshing && 'animate-spin',
            )}
          />
        </Button>
      </div>
    </div>
  )
}
