import { useEffect, useState } from 'react'

import { EbonyCubeSettingsModal } from '@/components/widgets/EbonyCubeSettingsModal'
import { EbonyCubeWidget } from '@/components/widgets/EbonyCubeWidget'
import { adjustEbonyCubeTicket, clearEbonyCube, cycleEbonyCubeTarget, fetchHomeworks } from '@/lib/homeworks'
import { subscribeHomeworksChanged } from '@/lib/homeworksEvents'
import { cn } from '@/lib/utils'
import type { EbonyCubeSummary, TicketType } from '@/types/ebonyCube'
import type { WidgetCardProps } from '@/types/widget'

// 낙원과 레이아웃 비율이 동일하다.
const PARADISE_LOADING_PLACEHOLDER_CLASSNAME =
  'flex h-11 items-center px-3 text-xs text-muted-foreground'

interface EbonyCubeWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/**
 * 에브니 큐브 버전의 가디언 카드. 쿠르잔 전선 위젯의 입장권 클릭이 이 위젯과 무관하게(다른
 * 컴포넌트에서) 등급별 수량을 바꿀 수 있으므로, 가디언/쿠르잔과 동일하게 subscribeHomeworksChanged를
 * 구독해 그 알림이 오면 다시 조회한다.
 */
function EbonyCubeWidgetBound({ characterId, characterNameForModal }: EbonyCubeWidgetBoundProps) {
  const [ebonyCubeData, setEbonyCubeData] = useState<EbonyCubeSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = (force = false) => {
      fetchHomeworks(characterId, { force }).then(({ ebonyCube }) => {
        if (!cancelled) setEbonyCubeData(ebonyCube)
      })
    }
    load()
    const unsubscribe = subscribeHomeworksChanged(characterId, () => load(true))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [characterId])

  if (!ebonyCubeData) {
    return <div className={PARADISE_LOADING_PLACEHOLDER_CLASSNAME}>불러오는 중...</div>
  }

  return (
    <>
      <EbonyCubeWidget
        data={ebonyCubeData}
        onCycleTarget={(direction) => {
          cycleEbonyCubeTarget(characterId, direction)
            .then(setEbonyCubeData)
            .catch((err) => console.error('큐브 목표 변경 실패', err))
        }}
        onClear={(times) => {
          clearEbonyCube(characterId, times)
            .then(setEbonyCubeData)
            .catch((err) => console.error('에브니 큐브 클리어 실패', err))
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <EbonyCubeSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterNameForModal}
        data={ebonyCubeData}
        onSave={(deltas) => {
          const entries = Object.entries(deltas) as [TicketType, number][]
          // 등급마다 별도 PATCH를 보내는데, 서버가 매 요청마다 selected_ticket_type을 다시
          // 계산해 쓸 수 있어(ensureValidSelection) 병렬로 보내면 나중 요청이 앞 요청의 판단을
          // 덮어써 최종 상태가 어긋날 수 있다 — 순서대로 하나씩 기다려 마지막 응답만 반영한다.
          void (async () => {
            try {
              let latest: EbonyCubeSummary | undefined
              for (const [ticketType, delta] of entries) {
                latest = await adjustEbonyCubeTicket(characterId, ticketType, delta)
              }
              if (latest) setEbonyCubeData(latest)
            } catch (err) {
              console.error('에브니 큐브 설정 저장 실패', err)
            }
          })()
        }}
      />
    </>
  )
}

export function EbonyCubeCard({
  width,
  disabledClassName,
  className,
  bannerCharacter,
  record,
}: WidgetCardProps) {
  // record는 WidgetVisual의 placeholder 분기에서 이미 보장됨(ebonyCube가 DEFAULT_VALUE_KINDS에 포함).
  return (
    <div style={{ width }} className={cn('select-none', disabledClassName, className)}>
      <EbonyCubeWidgetBound key={record!.id} characterId={record!.id} characterNameForModal={bannerCharacter.characterName} />
    </div>
  )
}
