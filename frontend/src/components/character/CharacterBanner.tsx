import { Swords, RefreshCw } from 'lucide-react'

import { BANNER_ZOOM_PERCENT, getBannerImagePosition } from '@/lib/bannerImagePosition'
import { cn } from '@/lib/utils'
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
  /** true면 배경 이미지·그라디언트·카드 배경을 그리지 않고 이름/스탯 내용만 그린다 — 배너 상세
   * (BANNER_DETAILED)처럼 바깥에서 더 큰 배경 이미지를 따로 깔고 그 위에 이 컴포넌트를 겹쳐 쓸 때
   * 쓴다. 기본값 false로, 단독 배너(10x2) 위젯은 지금까지와 완전히 동일하게 그려진다. */
  hideBackground?: boolean
}

export function CharacterBanner({
  character,
  onRefresh,
  isRefreshing = false,
  className,
  hideBackground = false,
}: CharacterBannerProps) {
  const { imageUrl, server, characterName, job, itemLevel, combatPower } = character
  // 근본 클래스별로 초상화 안에서 얼굴 위치가 달라서, 클래스에 맞는 크롭 위치를 따로 쓴다
  // (docs/widgets.typ 참고 없음 — lib/bannerImagePosition.ts에 튜닝값 기록).
  const bannerPosition = getBannerImagePosition(job)

  return (
    <div
      className={cn(
        'flex aspect-[10/2] items-center overflow-hidden rounded-xl border border-border shadow-lg',
        hideBackground ? 'bg-transparent' : 'bg-card',
        className,
      )}
    >
      {/* 아이덴티티 영역: 배경 이미지 + 서버/캐릭터명/직업. hideBackground일 때는 바깥(배너 상세)이
          이미 더 큰 배경 이미지를 깔아주므로 여기서는 그리지 않는다 */}
      <div className="relative h-full min-w-0 flex-1 overflow-hidden rounded-l-xl">
        {!hideBackground && (
          <div
            className="absolute inset-0 z-0"
            style={{ maskImage: 'linear-gradient(to right, black 40%, transparent 90%)' }}
          >
            {imageUrl && (
              <div
                className="h-full w-full opacity-65"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${BANNER_ZOOM_PERCENT}% auto`,
                  backgroundPosition: `${bannerPosition.faceX}% ${bannerPosition.faceY}%`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-card/10 via-card/85 to-card" />
          </div>
        )}

        <div className="relative z-10 flex h-full w-full min-w-0 flex-col items-end justify-center p-4 lg:p-6">
          {/* 새로고침: 전용 칸 대신 서버/직업과 클릭 영역을 통째로 묶어서, 아이콘뿐 아니라
              서버명·클래스명 위에 마우스를 올려도 새로고침이 눌리도록 한다. 바깥 div는 truncate가
              기준으로 삼을 폭(w-full)만 잡아주고, 실제 버튼(+호버 박스)은 내용물 크기만큼만 차지하도록
              분리한다 — 그러지 않으면 우측 정렬된 내용 왼쪽의 빈 공간까지 호버 박스에 포함돼버린다.
              group도 이름을 붙여서(group/refresh) 카드 전체를 감싸는 바깥 group(삭제/설정 버튼용)의
              호버와 섞이지 않도록 한다 — 안 그러면 카드 아무 데나 올려도 아이콘이 돌아간다. */}
          <div className="mb-1.5 flex w-full min-w-0 justify-end">
            <button
              type="button"
              aria-label="캐릭터 정보 새로고침"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="group/refresh flex min-w-0 max-w-full items-center gap-2 rounded-md px-2 py-1 font-mono text-3xl uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  'h-6 w-6 shrink-0 transition-transform duration-500 ease-in-out group-hover/refresh:rotate-180',
                  isRefreshing && 'animate-spin',
                )}
              />
              <span className="truncate">{server}</span>
              <span className="shrink-0 text-primary">/</span>
              <span className="truncate">{job}</span>
            </button>
          </div>
          <h2 className="w-full min-w-0 truncate bg-gradient-to-r from-foreground to-primary bg-clip-text text-right text-4xl font-extrabold tracking-tight text-transparent drop-shadow-sm lg:text-5xl">
            {characterName}
          </h2>
        </div>
      </div>

      {/* 스탯 영역: 전투력 / 아이템 레벨 */}
      <div className="flex items-center gap-4 pr-10">
        <div className="flex w-full flex-col gap-1">
          <div className="flex items-center justify-between gap-4">
            <Swords className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <span className="font-mono text-5xl font-bold leading-none text-primary">
              {numberFormatter.format(combatPower)}
            </span>
          </div>

          <div className="h-px w-full bg-border" />

          <div className="flex items-center justify-between gap-4">
            <span className="mt-1 font-mono text-base uppercase text-muted-foreground">
              LV.
            </span>
            <span className="font-mono text-5xl font-bold leading-none text-secondary">
              {numberFormatter.format(itemLevel)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
