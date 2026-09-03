import { Megaphone, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

export interface AnchorAdMockProps {
  isSidebarCollapsed: boolean
}

/**
 * 실제 광고 네트워크(AdSense) 연동 전에 레이아웃·상호작용만 미리 확인하기 위한 목업이다 —
 * `docs/ads.md`의 "사이드바에 동영상 광고를 넣는 건 어떤지" 논의에서 다룬 앵커 광고(Anchor ads)
 * 형태를 흉내낸다: 화면 하단에 붙어 스크롤과 무관하게 계속 보이고, 콘텐츠 위에 겹쳐 그려지며
 * (자리를 차지해 밀어내지 않음), 닫기 버튼으로 언제든 치울 수 있다. 실제 AdSense 스크립트는
 * 전혀 로드하지 않으므로 광고 요청·수익은 발생하지 않는다 — 배치가 실제로 어떻게 보이고
 * 동작할지 검토하는 용도로만 쓴다.
 */
export function AnchorAdMock({ isSidebarCollapsed }: AnchorAdMockProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  if (isDismissed) return null

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-dashed border-border bg-card/95 backdrop-blur-sm transition-[left] duration-200',
        isSidebarCollapsed ? 'md:left-16' : 'md:left-[240px]',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-center gap-3 px-4">
        <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">광고 자리 (Mock) — 320×50 / 반응형 앵커 광고 영역</span>
        <button
          type="button"
          aria-label="닫기"
          onClick={() => setIsDismissed(true)}
          className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
