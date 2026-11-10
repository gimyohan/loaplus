import { useEffect, useState } from 'react'

import { ParadiseGoldRewardModal } from '@/components/widgets/ParadiseGoldRewardModal'
import { ParadiseSettingsModal } from '@/components/widgets/ParadiseSettingsModal'
import { ParadiseWidget } from '@/components/widgets/ParadiseWidget'
import {
  consumeParadiseKey,
  consumeParadiseTicket,
  fetchHomeworks,
  recordParadiseGoldReward,
  updateParadiseSettings,
} from '@/lib/homeworks'
import { cn } from '@/lib/utils'
import type { ParadiseSummary } from '@/types/paradise'
import type { WidgetCardProps } from '@/types/widget'

// 낙원(5x2)은 가디언/쿠르잔 전선(5x3)과 원본 비율이 달라 로딩 중 자리표시 상자도 따로 둔다.
const PARADISE_LOADING_PLACEHOLDER_CLASSNAME =
  'flex h-11 items-center px-3 text-xs text-muted-foreground'

interface ParadiseWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/**
 * 낙원 버전의 가디언 카드 — 같은 이유로 key={characterId}로 재마운트한다. 가디언/쿠르잔 전선과
 * 달리 티켓/열쇠 소모나 자동 충전 토글이 로그로 남지 않아(rollback 대상이 아님) Logs 탭 되돌리기에
 * 반응할 필요가 없으므로 subscribeHomeworksChanged는 구독하지 않는다.
 */
function ParadiseWidgetBound({ characterId, characterNameForModal }: ParadiseWidgetBoundProps) {
  const [paradiseData, setParadiseData] = useState<ParadiseSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isGoldRewardOpen, setIsGoldRewardOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchHomeworks(characterId).then(({ paradise }) => {
      if (!cancelled) setParadiseData(paradise)
    })
    return () => {
      cancelled = true
    }
  }, [characterId])

  if (!paradiseData) {
    return <div className={PARADISE_LOADING_PLACEHOLDER_CLASSNAME}>불러오는 중...</div>
  }

  return (
    <>
      <ParadiseWidget
        data={paradiseData}
        onDecrementTicket={() => {
          consumeParadiseTicket(characterId)
            .then(setParadiseData)
            .catch((err) => console.error('낙원 티켓 사용 실패', err))
        }}
        onDecrementKey={() => {
          consumeParadiseKey(characterId)
            .then(setParadiseData)
            .catch((err) => console.error('낙원 열쇠 사용 실패', err))
        }}
        onOpenGoldReward={() => setIsGoldRewardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <ParadiseSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterNameForModal}
        data={paradiseData}
        onSave={(next) => {
          setParadiseData(next)
          updateParadiseSettings(characterId, next)
            .then(setParadiseData)
            .catch((err) => console.error('낙원 설정 저장 실패', err))
        }}
      />
      <ParadiseGoldRewardModal
        open={isGoldRewardOpen}
        onClose={() => setIsGoldRewardOpen(false)}
        onSubmit={(amount, description) => {
          recordParadiseGoldReward(characterId, amount, description).catch((err) =>
            console.error('낙원 귀속골드 기록 실패', err),
          )
        }}
      />
    </>
  )
}

export function ParadiseCard({
  width,
  disabledClassName,
  className,
  bannerCharacter,
  record,
}: WidgetCardProps) {
  // record는 WidgetVisual의 placeholder 분기에서 이미 보장됨(paradise가 DEFAULT_VALUE_KINDS에 포함).
  return (
    <div style={{ width }} className={cn('select-none', disabledClassName, className)}>
      <ParadiseWidgetBound key={record!.id} characterId={record!.id} characterNameForModal={bannerCharacter.characterName} />
    </div>
  )
}
