import { Hourglass, Ticket } from 'lucide-react'
import type { ComponentType } from 'react'

import { GameIcon } from '@/components/ui/GameIcon'
import { ShardIcon } from '@/components/widgets/icons'
import { GAME_ICONS } from '@/lib/gameAssets'
import { cn } from '@/lib/utils'
import type { TicketType } from '@/types/ebonyCube'

// 위젯 빠른 동작에 쓰는 공식 아이템 아이콘(컬러). 버튼이 넘겨주는 className(단색 아이콘용 15px)은
// 이미지를 불러오지 못했을 때의 대체 아이콘에만 쓰고, 컬러 이미지는 알아보기 쉽게 조금 크게(18px) 그린다.
const IMAGE_CLASSNAME = 'h-[18px] w-[18px]'

/** 운명의 편린(공식 아이콘). 실패하면 기존 편린 실루엣 아이콘. */
export function FateShardIcon({ className }: { className?: string }) {
  return <GameIcon src={GAME_ICONS.fateShard} className={IMAGE_CLASSNAME} fallback={<ShardIcon className={className} />} />
}

/** 시련의 모래(공식 아이콘). 실패하면 기존 모래시계 아이콘. */
export function TrialSandIcon({ className }: { className?: string }) {
  return <GameIcon src={GAME_ICONS.trialSand} className={IMAGE_CLASSNAME} fallback={<Hourglass className={cn(className)} />} />
}

/** 에브니 큐브 입장권(공식 아이콘) — 등급별 컴포넌트. 실패하면 기존 티켓 아이콘. 빠른 동작 icon 자리에
 * 컴포넌트를 넘겨야 해서, 렌더할 때마다 새로 만들지 않도록 등급별로 한 번만 만들어 둔다. */
function createEbonyCubeTicketIcon(ticketType: TicketType) {
  function EbonyCubeTicketIcon({ className }: { className?: string }) {
    return (
      <GameIcon
        src={GAME_ICONS.ebonyCubeTicket[ticketType]}
        className={IMAGE_CLASSNAME}
        fallback={<Ticket className={cn(className)} />}
      />
    )
  }
  return EbonyCubeTicketIcon
}

export const EBONY_CUBE_TICKET_ICONS: Record<TicketType, ComponentType<{ className?: string }>> = {
  unlock1: createEbonyCubeTicketIcon('unlock1'),
  unlock2: createEbonyCubeTicketIcon('unlock2'),
  unlock3: createEbonyCubeTicketIcon('unlock3'),
  unlock4: createEbonyCubeTicketIcon('unlock4'),
}
