import type { ComponentType } from 'react'

import { AbilityStoneCard } from '@/components/widgets/AbilityStoneCard'
import { BannerCard } from '@/components/widgets/BannerCard'
import { BannerCompactCard } from '@/components/widgets/BannerCompactCard'
import { BannerDetailedCard } from '@/components/widgets/BannerDetailedCard'
import { CounterCard } from '@/components/widgets/CounterCard'
import { EbonyCubeCard } from '@/components/widgets/EbonyCubeCard'
import { GuardianCard } from '@/components/widgets/GuardianCard'
import { HalHourglassCard } from '@/components/widgets/HalHourglassCard'
import { ImageCard } from '@/components/widgets/ImageCard'
import { KurzanFrontlineCard } from '@/components/widgets/KurzanFrontlineCard'
import { LinkIconCard } from '@/components/widgets/LinkIconCard'
import { ParadiseCard } from '@/components/widgets/ParadiseCard'
import { RaidCard } from '@/components/widgets/RaidCard'
import { TextCard } from '@/components/widgets/TextCard'
import { TextCheckboxCard } from '@/components/widgets/TextCheckboxCard'
import type { WidgetCardProps, WidgetKind } from '@/types/widget'

/**
 * kind별 위젯 렌더링 담당 컴포넌트 룩업. `WidgetVisual`은 이 맵에서 kind에 맞는 카드를 찾아
 * 공통 props(`WidgetCardProps`)를 내려주기만 하고, 실제 렌더링/상태/API 호출은 각 카드 파일
 * (`components/widgets/*Card.tsx`)이 갖는다. 여기 없는 kind는 `WidgetVisual`이 기본 자리표시자로
 * 대체한다(아직 실제 위젯이 구현되지 않은 경우).
 */
export const WIDGET_CARD_REGISTRY: Partial<Record<WidgetKind, ComponentType<WidgetCardProps>>> = {
  banner: BannerCard,
  bannerCompact: BannerCompactCard,
  bannerDetailed: BannerDetailedCard,
  guardian: GuardianCard,
  kurzanFrontline: KurzanFrontlineCard,
  paradise: ParadiseCard,
  raid: RaidCard,
  ebonyCube: EbonyCubeCard,
  halHourglass: HalHourglassCard,
  text: TextCard,
  textCheckbox: TextCheckboxCard,
  counter: CounterCard,
  image: ImageCard,
  linkIcon: LinkIconCard,
  abilityStone: AbilityStoneCard,
}
