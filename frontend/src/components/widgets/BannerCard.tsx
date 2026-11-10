import { useState } from 'react'

import { CharacterBanner } from '@/components/character/CharacterBanner'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

const EXPANDED_STORAGE_PREFIX = 'loaplus:banner-expanded:'

function readStoredExpanded(characterId: string | undefined): boolean | null {
  if (!characterId) return null
  try {
    const value = window.localStorage.getItem(EXPANDED_STORAGE_PREFIX + characterId)
    return value === null ? null : value === '1'
  } catch {
    return null
  }
}

function storeExpanded(characterId: string | undefined, expanded: boolean) {
  if (!characterId) return
  try {
    window.localStorage.setItem(EXPANDED_STORAGE_PREFIX + characterId, expanded ? '1' : '0')
  } catch {
    // 시크릿 창 등에서 저장소를 못 쓰면 이번 화면에서만 유지된다.
  }
}

/**
 * 캐릭터 배너 위젯. DB에는 예전 배너 3종(BANNER_COMPACT / BANNER / BANNER_DETAILED)이 그대로 남아
 * 있지만 셋 다 같은 350px 배너(CharacterBanner)로 그린다 — 종류는 장비 정보를 처음에 펼쳐 둘지만
 * 정한다(상세 배너만 펼침). 사용자가 접고 펼친 상태는 캐릭터별로 이 브라우저에 기억한다(기기마다
 * 따로, 서버에 저장하지 않는 표시 설정).
 */
export function BannerCard({
  disabledClassName,
  className,
  bannerCharacter,
  isRefreshing,
  onRefresh,
  catalogItem,
  record,
  width,
}: WidgetCardProps) {
  const characterId = record?.id
  const defaultExpanded = catalogItem?.kind === 'bannerDetailed'
  const [expanded, setExpanded] = useState(() => readStoredExpanded(characterId) ?? defaultExpanded)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    storeExpanded(characterId, next)
  }

  return (
    <div style={{ width }} className={cn('select-none', disabledClassName, className)}>
      <CharacterBanner
        character={bannerCharacter}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
        expanded={expanded}
        onToggleExpanded={toggle}
      />
    </div>
  )
}
