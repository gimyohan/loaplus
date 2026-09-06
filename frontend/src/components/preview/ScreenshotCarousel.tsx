import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

import type { ScreenshotPair } from '@/mocks/previewScreenshots'

export interface ScreenshotCarouselProps {
  pairs: ScreenshotPair[]
  onLoginClick: () => void
}

/** 로그인 전 사이드바 탭을 누르면 보여주는 스크린샷+설명 캐러셀. 실제 데이터/위젯을 흉내내지
 * 않고 순수 이미지+텍스트만 보여주므로, 이전에 있던 mock 상호작용 대비 유지보수 부담이 훨씬
 * 낮다(사용자 확인) — 탭마다 완전히 독립된 pairs를 받는다. 호출하는 쪽(App.tsx)이 탭 종류를
 * key로 넘겨 탭이 바뀔 때마다 이 컴포넌트를 통째로 새로 마운트하므로, index는 항상 그 탭의
 * 0번부터 다시 시작한다. */
export function ScreenshotCarousel({ pairs, onLoginClick }: ScreenshotCarouselProps) {
  const [index, setIndex] = useState(0)
  const current = pairs[index]

  const goPrev = () => setIndex((i) => (i - 1 + pairs.length) % pairs.length)
  const goNext = () => setIndex((i) => (i + 1) % pairs.length)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
        <span className="text-sm text-muted-foreground">화면 예시입니다. 로그인하면 내 캐릭터로 직접 써볼 수 있어요.</span>
        <button
          type="button"
          onClick={onLoginClick}
          className="shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          로그인하고 시작하기
        </button>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 스크린샷"
            disabled={pairs.length <= 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* min-w-0: img(대체 요소)는 flex item일 때 기본 min-width가 auto라, 원본 크기보다
              작게 줄어들지 않고 옆 버튼을 밀어내며 넘친다 — 그 상태에서 이미지의 실제 중심이
              행(row) 중심과 어긋나 아래 설명 문단과도 어긋나 보였다(사용자 확인). */}
          <img
            src={current.src}
            alt={current.description}
            className="aspect-[8/5] w-full min-w-0 rounded-xl border border-border object-cover shadow-lg"
          />

          <button
            type="button"
            onClick={goNext}
            aria-label="다음 스크린샷"
            disabled={pairs.length <= 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p className="max-w-2xl text-center text-sm text-muted-foreground">{current.description}</p>

        {pairs.length > 1 && (
          <div className="flex gap-1.5">
            {pairs.map((pair, i) => (
              <button
                key={pair.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`${i + 1}번째 스크린샷 보기`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-primary' : 'w-1.5 bg-muted hover:bg-muted-foreground/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
