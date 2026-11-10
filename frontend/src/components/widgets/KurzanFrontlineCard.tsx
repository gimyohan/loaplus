import { useEffect, useState } from 'react'

import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { KurzanFrontlineSettingsModal } from '@/components/widgets/KurzanFrontlineSettingsModal'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { kurzanTicketTierLabel } from '@/lib/contentStages'
import {
  claimKurzanAzenaBlessingReward,
  claimKurzanShardReward,
  collectKurzanTicket,
  fetchHomeworks,
  harvestKurzan,
  resetKurzan,
  undoKurzanHarvest,
  updateKurzanTarget,
} from '@/lib/homeworks'
import { notifyHomeworksChanged, subscribeHomeworksChanged } from '@/lib/homeworksEvents'
import { useReportPendingHomework } from '@/lib/pendingHomework'
import { withObjectParticle } from '@/lib/korean'
import { showToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'
import type { WidgetCardProps } from '@/types/widget'

const LOADING_PLACEHOLDER_CLASSNAME =
  'flex aspect-[5/3] items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground'

interface KurzanFrontlineWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/** 쿠르잔 전선 버전의 가디언 카드 — 같은 이유로 key={characterId}로 재마운트한다. */
function KurzanFrontlineWidgetBound({
  characterId,
  characterNameForModal,
}: KurzanFrontlineWidgetBoundProps) {
  const [kurzanData, setKurzanData] = useState<KurzanFrontlineSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // 사이드바 미완료 뱃지: 오늘 수확 안 했으면 1개(GuardianCard와 같은 방식).
  useReportPendingHomework(characterId, kurzanData ? !kurzanData.isHarvested : null, 'kurzanFrontline')

  useEffect(() => {
    let cancelled = false
    const load = (force = false) => {
      fetchHomeworks(characterId, { force }).then(({ kurzan }) => {
        if (!cancelled) setKurzanData(kurzan)
      })
    }
    load()
    // Logs 탭에서 이 캐릭터의 HARVEST_KURZAN 로그를 되돌리면 여기도 다시 조회해 반영한다.
    // 이때는 캐시가 아니라 항상 최신 값을 받아야 하므로 force로 부른다.
    const unsubscribe = subscribeHomeworksChanged(characterId, () => load(true))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [characterId])

  if (!kurzanData) {
    return <div className={LOADING_PLACEHOLDER_CLASSNAME}>불러오는 중...</div>
  }

  return (
    <>
      <KurzanFrontlineWidget
        data={kurzanData}
        onToggleHarvested={(checked) => {
          if (checked) {
            harvestKurzan(characterId, kurzanData.targetName)
              .then((next) => {
                setKurzanData(next)
                notifyHomeworksChanged(characterId)
              })
              .catch((err) => console.error('쿠르잔 전선 수확 처리 실패', err))
            return
          }

          // 체크 해제 = 로그 롤백 재사용(게이지 원복 + 로그 삭제). 공명의 비약(/kurzan/reset)과는
          // 다른 동작이다(docs/api.typ "체크박스 해제" 참고) — 롤백 후 최신 상태를 다시 조회한다.
          undoKurzanHarvest(characterId)
            .then(() => fetchHomeworks(characterId, { force: true }))
            .then(({ kurzan }) => {
              setKurzanData(kurzan)
              notifyHomeworksChanged(characterId)
            })
            .catch((err) => console.error('쿠르잔 전선 수확 되돌리기 실패', err))
        }}
        onUseResonancePotion={() => {
          resetKurzan(characterId)
            .then((next) => {
              setKurzanData(next)
              notifyHomeworksChanged(characterId)
            })
            .catch((err) => console.error('공명비약 사용 실패', err))
        }}
        onQuickAction={(key) => {
          if (key !== 'ticket') return
          // 현재 목표(target_name)가 혼돈의 균열 구간이면 시련의 모래가, 그 외에는 대응하는
          // 에브니 큐브 등급 수량이 +1 된다(서버가 판단) — 이 위젯 자체 상태는 바뀌지 않고
          // 에브니 큐브/할의 모래시계 쪽 상태만 바뀌므로, 그 위젯이 열려 있다면 다시 조회하도록
          // 알린다(docs/ebony_cube_hal_hourglass.typ 참고). 응답이 어느 쪽 요약인지(sandStack
          // 유무)로 구분해 실제로 뭘 얻었는지 토스트로 알려준다.
          collectKurzanTicket(characterId)
            .then((result) => {
              notifyHomeworksChanged(characterId)
              const who = `[${characterNameForModal}]`
              if ('sandStack' in result) {
                showToast({ message: `${who} 시련의 모래를 획득했습니다` })
              } else {
                const tierLabel = kurzanTicketTierLabel(kurzanData.targetName)
                showToast({
                  message: `${who} ${tierLabel ? `${tierLabel} 티켓` : '에브니 큐브 티켓'}을 획득했습니다`,
                })
              }
            })
            .catch((err) => console.error('쿠르잔 전선 티켓/모래 획득 실패', err))
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClaimShardReward={(item) => {
          claimKurzanShardReward(characterId, item.id, kurzanData.targetName)
            .then(() => {
              showToast({ message: `[${characterNameForModal}] ${withObjectParticle(item.name)} 획득했습니다` })
            })
            .catch((err) => console.error('편린 보상 확정 실패', err))
        }}
        onClaimAzenaBlessingReward={(item) => {
          claimKurzanAzenaBlessingReward(characterId, item.id, kurzanData.targetName)
            .then(() => {
              showToast({ message: `[${characterNameForModal}] ${withObjectParticle(item.name)} 획득했습니다` })
            })
            .catch((err) => console.error('아제나 축복 보상 확정 실패', err))
        }}
      />
      <KurzanFrontlineSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterNameForModal}
        data={kurzanData}
        onSave={(next) => {
          setKurzanData(next)
          updateKurzanTarget(characterId, {
            restGauge: next.restGauge,
            restGaugeThreshold: next.restGaugeThreshold,
          })
            .then(setKurzanData)
            .catch((err) => console.error('쿠르잔 전선 설정 저장 실패', err))
        }}
      />
    </>
  )
}

export function KurzanFrontlineCard({
  width,
  height,
  disabledClassName,
  className,
  bannerCharacter,
  record,
  catalogItem,
}: WidgetCardProps) {
  // record는 WidgetVisual의 placeholder 분기에서 이미 보장됨(kurzanFrontline이 DEFAULT_VALUE_KINDS에 포함).
  return (
    <ScaleToFit
      nativeWidth={catalogItem!.nativeWidth!}
      nativeHeight={catalogItem!.nativeHeight!}
      width={width}
      height={height}
      className={cn('select-none rounded-xl', disabledClassName, className)}
    >
      <KurzanFrontlineWidgetBound
        key={record!.id}
        characterId={record!.id}
        characterNameForModal={bannerCharacter.characterName}
      />
    </ScaleToFit>
  )
}
