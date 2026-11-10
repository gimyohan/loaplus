import { useEffect, useState } from 'react'

import { HalHourglassSettingsModal } from '@/components/widgets/HalHourglassSettingsModal'
import { HalHourglassWidget } from '@/components/widgets/HalHourglassWidget'
import { adjustHalHourglassSand, completeHalHourglass, fetchHomeworks, undoHalHourglassComplete } from '@/lib/homeworks'
import { notifyHomeworksChanged, subscribeHomeworksChanged } from '@/lib/homeworksEvents'
import { useReportPendingHomework } from '@/lib/pendingHomework'
import { cn } from '@/lib/utils'
import type { HalHourglassSummary } from '@/types/halHourglass'
import type { WidgetCardProps } from '@/types/widget'

// 낙원과 레이아웃 비율이 동일하다.
const PARADISE_LOADING_PLACEHOLDER_CLASSNAME =
  'flex h-11 items-center px-3 text-xs text-muted-foreground'

interface HalHourglassWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/** 할의 모래시계 버전의 가디언 카드 — 같은 이유로 key={characterId}로 재마운트한다. */
function HalHourglassWidgetBound({ characterId, characterNameForModal }: HalHourglassWidgetBoundProps) {
  const [hourglassData, setHourglassData] = useState<HalHourglassSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // 사이드바 미완료 뱃지: 이번 주 완료 안 했으면 1개(GuardianCard와 같은 방식).
  useReportPendingHomework(characterId, hourglassData ? !hourglassData.isCompleted : null, 'halHourglass')

  useEffect(() => {
    let cancelled = false
    const load = (force = false) => {
      fetchHomeworks(characterId, { force }).then(({ halHourglass }) => {
        if (!cancelled) setHourglassData(halHourglass)
      })
    }
    load()
    // Logs 탭에서 이 캐릭터의 HAL_HOURGLASS_COMPLETE 로그를 되돌리면 여기도 다시 조회해 반영한다.
    // 이때는 캐시가 아니라 항상 최신 값을 받아야 하므로 force로 부른다.
    const unsubscribe = subscribeHomeworksChanged(characterId, () => load(true))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [characterId])

  if (!hourglassData) {
    return <div className={PARADISE_LOADING_PLACEHOLDER_CLASSNAME}>불러오는 중...</div>
  }

  return (
    <>
      <HalHourglassWidget
        data={hourglassData}
        onToggleCompleted={(checked) => {
          if (checked) {
            completeHalHourglass(characterId, hourglassData.level)
              .then((next) => {
                setHourglassData(next)
                notifyHomeworksChanged(characterId)
              })
              .catch((err) => console.error('할의 모래시계 완료 처리 실패', err))
            return
          }

          // 체크 해제 = 로그 롤백 재사용(스택/완료 여부 원복). 가디언/쿠르잔 '오늘 수확' 해제와
          // 동일한 패턴이다(docs/api.typ "체크박스 해제" 참고).
          undoHalHourglassComplete(characterId)
            .then(() => fetchHomeworks(characterId, { force: true }))
            .then(({ halHourglass }) => {
              setHourglassData(halHourglass)
              notifyHomeworksChanged(characterId)
            })
            .catch((err) => console.error('할의 모래시계 완료 되돌리기 실패', err))
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <HalHourglassSettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characterName={characterNameForModal}
        data={hourglassData}
        onSave={(delta) => {
          adjustHalHourglassSand(characterId, delta)
            .then(setHourglassData)
            .catch((err) => console.error('할의 모래시계 설정 저장 실패', err))
        }}
      />
    </>
  )
}

export function HalHourglassCard({
  width,
  disabledClassName,
  className,
  bannerCharacter,
  record,
}: WidgetCardProps) {
  // record는 WidgetVisual의 placeholder 분기에서 이미 보장됨(halHourglass가 DEFAULT_VALUE_KINDS에 포함).
  return (
    <div style={{ width }} className={cn('select-none', disabledClassName, className)}>
      <HalHourglassWidgetBound key={record!.id} characterId={record!.id} characterNameForModal={bannerCharacter.characterName} />
    </div>
  )
}
