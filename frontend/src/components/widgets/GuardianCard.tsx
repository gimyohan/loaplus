import { useEffect, useState } from 'react'

import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { GuardianSettingsModal } from '@/components/widgets/GuardianSettingsModal'
import { GuardianWidget } from '@/components/widgets/GuardianWidget'
import {
  claimGuardianAzenaBlessingReward,
  claimGuardianShardReward,
  fetchHomeworks,
  harvestGuardian,
  undoGuardianHarvest,
  updateGuardianTarget,
} from '@/lib/homeworks'
import { notifyHomeworksChanged, subscribeHomeworksChanged } from '@/lib/homeworksEvents'
import { withObjectParticle } from '@/lib/korean'
import { showToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { GuardianSummary } from '@/types/guardian'
import type { WidgetCardProps } from '@/types/widget'

const LOADING_PLACEHOLDER_CLASSNAME =
  'flex aspect-[5/3] items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground'

interface GuardianWidgetBoundProps {
  characterId: string
  characterNameForModal: string
  characterItemLevel: number
}

/**
 * 가디언 위젯의 실제 상태를 소유한다. 마운트 시 `GET .../homeworks`로 초기값을 가져오고,
 * 이후 체크/설정 저장은 각각 harvest·reset·target API를 호출해 서버 응답으로 갱신한다.
 * 부모가 key={characterId}로 렌더링해서, 카드에 귀속된 캐릭터가 바뀌면 재마운트되어 다시 조회한다.
 */
function GuardianWidgetBound({
  characterId,
  characterNameForModal,
  characterItemLevel,
}: GuardianWidgetBoundProps) {
  const [guardianData, setGuardianData] = useState<GuardianSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = (force = false) => {
      fetchHomeworks(characterId, { force }).then(({ guardian }) => {
        if (!cancelled) setGuardianData(guardian)
      })
    }
    load()
    // Logs 탭에서 이 캐릭터의 HARVEST_GUARDIAN 로그를 되돌리면 여기도 다시 조회해 반영한다.
    // 이때는 캐시가 아니라 항상 최신 값을 받아야 하므로 force로 부른다.
    const unsubscribe = subscribeHomeworksChanged(characterId, () => load(true))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [characterId])

  if (!guardianData) {
    return <div className={LOADING_PLACEHOLDER_CLASSNAME}>불러오는 중...</div>
  }

  return (
    <>
      <GuardianWidget
        data={guardianData}
        onToggleHarvested={(checked) => {
          if (checked) {
            harvestGuardian(characterId, guardianData.targetName)
              .then((next) => {
                setGuardianData(next)
                notifyHomeworksChanged(characterId)
              })
              .catch((err) => console.error('가디언 수확 처리 실패', err))
            return
          }

          // 체크 해제 = 로그 롤백 재사용(게이지 원복 + 로그 삭제). /guardian/reset과는 다른 동작이다
          // (docs/api.typ "체크박스 해제" 참고) — 롤백 후 최신 상태를 다시 조회한다.
          undoGuardianHarvest(characterId)
            .then(() => fetchHomeworks(characterId, { force: true }))
            .then(({ guardian }) => {
              setGuardianData(guardian)
              notifyHomeworksChanged(characterId)
            })
            .catch((err) => console.error('가디언 수확 되돌리기 실패', err))
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClaimShardReward={(item) => {
          claimGuardianShardReward(characterId, item.id, guardianData.targetName)
            .then(() => {
              showToast({ message: `[${characterNameForModal}] ${withObjectParticle(item.name)} 획득했습니다` })
            })
            .catch((err) => console.error('편린 보상 확정 실패', err))
        }}
        onClaimAzenaBlessingReward={(item) => {
          claimGuardianAzenaBlessingReward(characterId, item.id, guardianData.targetName)
            .then(() => {
              showToast({ message: `[${characterNameForModal}] ${withObjectParticle(item.name)} 획득했습니다` })
            })
            .catch((err) => console.error('아제나 축복 보상 확정 실패', err))
        }}
      />
      <GuardianSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterNameForModal}
        characterItemLevel={characterItemLevel}
        data={guardianData}
        onSave={(next) => {
          setGuardianData(next)
          updateGuardianTarget(characterId, {
            targetName: next.targetName,
            restGauge: next.restGauge,
            restGaugeThreshold: next.restGaugeThreshold,
          })
            .then(setGuardianData)
            .catch((err) => console.error('가디언 설정 저장 실패', err))
        }}
      />
    </>
  )
}

export function GuardianCard({
  width,
  height,
  disabledClassName,
  className,
  bannerCharacter,
  record,
  catalogItem,
}: WidgetCardProps) {
  // record는 WidgetVisual의 placeholder 분기에서 이미 보장됨(guardian이 DEFAULT_VALUE_KINDS에 포함).
  return (
    <ScaleToFit
      nativeWidth={catalogItem!.nativeWidth!}
      nativeHeight={catalogItem!.nativeHeight!}
      width={width}
      height={height}
      className={cn('select-none rounded-xl', disabledClassName, className)}
    >
      <GuardianWidgetBound
        key={record!.id}
        characterId={record!.id}
        characterNameForModal={bannerCharacter.characterName}
        characterItemLevel={bannerCharacter.itemLevel}
      />
    </ScaleToFit>
  )
}
