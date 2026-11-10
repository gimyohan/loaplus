import { Hourglass } from 'lucide-react'

import { GameIcon } from '@/components/ui/GameIcon'
import { ShardIcon } from '@/components/widgets/icons'
import { GAME_ICONS } from '@/lib/gameAssets'
import { cn } from '@/lib/utils'

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
