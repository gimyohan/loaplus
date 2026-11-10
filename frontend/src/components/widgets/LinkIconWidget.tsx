import { Link2, Plus } from 'lucide-react'
import { useState } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface LinkIconWidgetProps {
  url: string | null
  label?: string | null
  onOpenSettings?: () => void
  className?: string
}

/** url의 origin으로 구글 파비콘 서비스 주소를 만든다. url이 유효하지 않으면 null. */
function faviconUrl(url: string): string | null {
  try {
    const { origin } = new URL(url)
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(origin)}`
  } catch {
    return null
  }
}

/**
 * 외부 링크 바로가기 위젯 (docs/widgets.typ 참고). 클릭하면 등록한 링크로 새 탭에서 이동한다.
 * 아이콘은 등록한 사이트의 파비콘을 그대로 보여주고(불러오지 못하면 기본 링크 아이콘으로 대체),
 * 한 번 등록하면 수정할 수 없다 — 다른 링크로 바꾸려면 위젯을 삭제하고 새로 추가해야 한다
 * (레이드 위젯이 관문 진행 후 목표를 못 바꾸는 것과 같은 원칙, docs/widgets.typ 참고).
 */
export function LinkIconWidget({ url, label, onOpenSettings, className }: LinkIconWidgetProps) {
  const [faviconFailed, setFaviconFailed] = useState(false)
  const favicon = url ? faviconUrl(url) : null

  const content = (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center rounded-lg border border-border bg-white/[0.03] transition-colors hover:border-foreground/30',
        className,
      )}
    >
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-full w-full items-center justify-center text-muted-foreground transition-colors hover:text-primary"
        >
          {favicon && !faviconFailed ? (
            <img
              src={favicon}
              alt=""
              className="h-[60%] w-[60%] rounded-sm object-contain"
              onError={() => setFaviconFailed(true)}
            />
          ) : (
            <Link2 className="h-[55%] w-[55%]" />
          )}
        </a>
      ) : (
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="링크 추가"
          className="flex h-full w-full items-center justify-center text-muted-foreground transition-colors hover:text-primary"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  )

  // Tooltip은 자기 wrapper div에 크기를 스스로 정하지 않으므로(내용 크기만큼만 차지), 이 위젯처럼
  // flex 부모 없이 고정 크기 부모(ScaleToFit) 안에 바로 놓일 땐 h-full w-full을 명시해야 부모
  // 크기를 그대로 채운다 — 안 그러면 카드가 내용물 크기로 쪼그라들어 파비콘이 잘려 보인다.
  return label ? (
    <Tooltip label={label} className="h-full w-full">
      {content}
    </Tooltip>
  ) : (
    content
  )
}
