import { useEffect, useState } from 'react'

import { CharacterBanner } from '@/components/character/CharacterBanner'
import { CharacterBannerCompact } from '@/components/character/CharacterBannerCompact'
import { CharacterBannerDetailed } from '@/components/character/CharacterBannerDetailed'
import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { AbilityStoneModal } from '@/components/widgets/AbilityStoneModal'
import { AbilityStoneWidget } from '@/components/widgets/AbilityStoneWidget'
import { EbonyCubeSettingsModal } from '@/components/widgets/EbonyCubeSettingsModal'
import { EbonyCubeWidget } from '@/components/widgets/EbonyCubeWidget'
import { GuardianSettingsModal } from '@/components/widgets/GuardianSettingsModal'
import { GuardianWidget } from '@/components/widgets/GuardianWidget'
import { HalHourglassSettingsModal } from '@/components/widgets/HalHourglassSettingsModal'
import { HalHourglassWidget } from '@/components/widgets/HalHourglassWidget'
import { ImageWidget } from '@/components/widgets/ImageWidget'
import { KurzanFrontlineSettingsModal } from '@/components/widgets/KurzanFrontlineSettingsModal'
import { KurzanFrontlineWidget } from '@/components/widgets/KurzanFrontlineWidget'
import { LinkIconSettingsModal } from '@/components/widgets/LinkIconSettingsModal'
import { LinkIconWidget } from '@/components/widgets/LinkIconWidget'
import { ParadiseGoldRewardModal } from '@/components/widgets/ParadiseGoldRewardModal'
import { ParadiseSettingsModal } from '@/components/widgets/ParadiseSettingsModal'
import { ParadiseWidget } from '@/components/widgets/ParadiseWidget'
import { RaidTargetModal } from '@/components/widgets/RaidTargetModal'
import { RaidWidget, type RaidGateView } from '@/components/widgets/RaidWidget'
import {
  RESET_DAYS_OFF,
  TextCheckboxSettingsModal,
  type TextCheckboxResetDays,
} from '@/components/widgets/TextCheckboxSettingsModal'
import { TextCheckboxWidget } from '@/components/widgets/TextCheckboxWidget'
import { TextWidget } from '@/components/widgets/TextWidget'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import {
  adjustEbonyCubeTicket,
  adjustHalHourglassSand,
  claimGuardianAzenaBlessingReward,
  claimGuardianShardReward,
  claimKurzanAzenaBlessingReward,
  claimKurzanShardReward,
  clearEbonyCube,
  collectHalHourglassSand,
  collectKurzanTicket,
  completeHalHourglass,
  consumeParadiseKey,
  consumeParadiseTicket,
  cycleEbonyCubeTarget,
  fetchHomeworks,
  harvestGuardian,
  harvestKurzan,
  recordParadiseGoldReward,
  resetKurzan,
  undoGuardianHarvest,
  undoHalHourglassComplete,
  undoKurzanHarvest,
  updateGuardianTarget,
  updateKurzanTarget,
  updateParadiseSettings,
} from '@/lib/homeworks'
import { notifyHomeworksChanged, subscribeHomeworksChanged } from '@/lib/homeworksEvents'
import { kurzanTicketTierLabel } from '@/lib/contentStages'
import { showToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import raidCatalogData from '@/data/raidCatalog.json'
import {
  ABILITY_STONE_NATIVE_HEIGHT,
  ABILITY_STONE_NATIVE_WIDTH,
  BANNER_COMPACT_NATIVE_HEIGHT,
  BANNER_COMPACT_NATIVE_WIDTH,
  BANNER_DETAILED_NATIVE_HEIGHT,
  BANNER_DETAILED_NATIVE_WIDTH,
  BANNER_NATIVE_HEIGHT,
  BANNER_NATIVE_WIDTH,
  EBONY_CUBE_NATIVE_HEIGHT,
  EBONY_CUBE_NATIVE_WIDTH,
  GUARDIAN_NATIVE_HEIGHT,
  GUARDIAN_NATIVE_WIDTH,
  HAL_HOURGLASS_NATIVE_HEIGHT,
  HAL_HOURGLASS_NATIVE_WIDTH,
  IMAGE_NATIVE_HEIGHT,
  IMAGE_NATIVE_WIDTH,
  KURZAN_FRONTLINE_NATIVE_HEIGHT,
  KURZAN_FRONTLINE_NATIVE_WIDTH,
  LINK_ICON_NATIVE_HEIGHT,
  LINK_ICON_NATIVE_WIDTH,
  PARADISE_NATIVE_HEIGHT,
  PARADISE_NATIVE_WIDTH,
  RAID_NATIVE_HEIGHT,
  RAID_NATIVE_WIDTH,
  TEXT_CHECKBOX_NATIVE_HEIGHT,
  TEXT_CHECKBOX_NATIVE_WIDTH,
  TEXT_NATIVE_HEIGHT,
  TEXT_NATIVE_WIDTH,
  WIDGET_CATALOG,
} from '@/lib/widgetCatalog'
import { mockCharacter } from '@/mocks/character'
import type { EbonyCubeSummary, TicketType } from '@/types/ebonyCube'
import type { GuardianSummary } from '@/types/guardian'
import type { HalHourglassSummary } from '@/types/halHourglass'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'
import type { ParadiseSummary } from '@/types/paradise'
import type { RaidTargetSummary } from '@/types/raid'
import type { WidgetKind } from '@/types/widget'

const RAID_CATALOG = raidCatalogData.raids

// 팔레트 미리보기 등 특정 위젯 인스턴스에 묶이지 않은 곳에서 raid를 렌더링할 때 쓰는 예시 데이터.
// 실제로 막 추가한 레이드 위젯도 목표 없이 빈 상태로 시작하므로, 미리보기도 같은 빈 상태를 보여준다.
const MOCK_RAID_PREVIEW: RaidTargetSummary = {
  raidKey: null,
  difficultyKey: null,
  gates: [],
  goldRewardEnabled: true,
}

export interface WidgetVisualProps {
  kind: WidgetKind
  width: number
  height: number
  /** true면 위젯 내부 상호작용(새로고침 버튼, 체크박스 등)을 그대로 사용할 수 있다 */
  interactive?: boolean
  /**
   * 이 위젯이 속한 카드에 귀속된 캐릭터 이름. Default Value 위젯(배너, 가디언, 쿠르잔 전선)의
   * 상태를 이 이름으로 실제 캐릭터 API(CharacterDirectoryContext)에서 조회한다.
   * 팔레트 미리보기처럼 특정 카드에 속하지 않은 경우 이 prop 자체를 생략해서 예시 데이터를 보여주고,
   * 카드에는 배치됐지만 아직 이름을 설정하지 않은 경우엔 빈 문자열을 넘겨 안내 문구를 보여준다.
   */
  characterName?: string
  /** Additional Value 위젯의 위젯별 데이터(text/textCheckbox/image/linkIcon). Default Value 위젯은 무시된다. */
  customData?: Record<string, unknown> | null
  /** Additional Value 위젯의 내용이 바뀌었을 때(interactive일 때만 호출됨) */
  onCustomDataChange?: (customData: Record<string, unknown>) => void
  /** textCheckbox 위젯의 체크 토글(interactive일 때만 호출됨) */
  onCheckboxToggle?: (isChecked: boolean) => void
  /** kind === 'raid'일 때 이 위젯 인스턴스가 가리키는 레이드 슬롯의 목표/관문 상태 */
  raid?: RaidTargetSummary | null
  /** 이미 다른 레이드 위젯이 쓰고 있는 레이드 키 목록(이 위젯 자신은 제외) — 목표 변경 모달에서
   * 같은 레이드를 중복으로 고르지 못하게 막는 데 쓴다 */
  raidExcludedKeys?: string[]
  /** 레이드 관문 완료 체크박스 토글(interactive일 때만 호출됨) */
  onRaidGateToggle?: (gateIndex: number, cleared: boolean) => void
  /** 레이드 관문 '더보기' 토글(interactive일 때만 호출됨) */
  onRaidMoreRewardToggle?: (gateIndex: number, enabled: boolean) => void
  /** 레이드 목표(레이드/난이도) 변경(interactive일 때만 호출됨) */
  onRaidTargetChange?: (raidKey: string, difficultyKey: string) => void
  /** 레이드 골드 획득 허용/거부 토글(interactive일 때만 호출됨) */
  onRaidGoldRewardChange?: (enabled: boolean) => void
  className?: string
}

const DEFAULT_VALUE_KINDS: WidgetKind[] = [
  'banner',
  'bannerCompact',
  'bannerDetailed',
  'guardian',
  'kurzanFrontline',
  'paradise',
  'raid',
  'ebonyCube',
  'halHourglass',
]

const LOADING_PLACEHOLDER_CLASSNAME =
  'flex aspect-[5/3] items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground'
// 낙원(5x2)은 가디언/쿠르잔 전선(5x3)과 원본 비율이 달라 로딩 중 자리표시 상자도 따로 둔다.
const PARADISE_LOADING_PLACEHOLDER_CLASSNAME =
  'flex aspect-[5/2] items-center justify-center rounded-xl border border-border bg-card text-xs text-muted-foreground'

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
          claimGuardianShardReward(characterId, item.id, guardianData.targetName).catch((err) =>
            console.error('편린 보상 확정 실패', err),
          )
        }}
        onClaimAzenaBlessingReward={(item) => {
          claimGuardianAzenaBlessingReward(characterId, item.id, guardianData.targetName).catch((err) =>
            console.error('아제나 축복 보상 확정 실패', err),
          )
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

interface KurzanFrontlineWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/** 쿠르잔 전선 버전의 {@link GuardianWidgetBound} — 같은 이유로 key={characterId}로 재마운트한다. */
function KurzanFrontlineWidgetBound({
  characterId,
  characterNameForModal,
}: KurzanFrontlineWidgetBoundProps) {
  const [kurzanData, setKurzanData] = useState<KurzanFrontlineSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
          claimKurzanShardReward(characterId, item.id, kurzanData.targetName).catch((err) =>
            console.error('편린 보상 확정 실패', err),
          )
        }}
        onClaimAzenaBlessingReward={(item) => {
          claimKurzanAzenaBlessingReward(characterId, item.id, kurzanData.targetName).catch((err) =>
            console.error('아제나 축복 보상 확정 실패', err),
          )
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

interface ParadiseWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/**
 * 낙원 버전의 {@link GuardianWidgetBound} — 같은 이유로 key={characterId}로 재마운트한다. 가디언/
 * 쿠르잔 전선과 달리 티켓/열쇠 소모나 자동 충전 토글이 로그로 남지 않아(rollback 대상이 아님)
 * Logs 탭 되돌리기에 반응할 필요가 없으므로 subscribeHomeworksChanged는 구독하지 않는다.
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

interface EbonyCubeWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/**
 * 에브니 큐브 버전의 {@link GuardianWidgetBound}. 쿠르잔 전선 위젯의 입장권 클릭이 이 위젯과
 * 무관하게(다른 컴포넌트에서) 등급별 수량을 바꿀 수 있으므로, 가디언/쿠르잔과 동일하게
 * subscribeHomeworksChanged를 구독해 그 알림이 오면 다시 조회한다.
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

interface HalHourglassWidgetBoundProps {
  characterId: string
  characterNameForModal: string
}

/** 할의 모래시계 버전의 {@link GuardianWidgetBound} — 같은 이유로 key={characterId}로 재마운트한다. */
function HalHourglassWidgetBound({ characterId, characterNameForModal }: HalHourglassWidgetBoundProps) {
  const [hourglassData, setHourglassData] = useState<HalHourglassSummary | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
        onCollectSand={() => {
          collectHalHourglassSand(characterId)
            .then(setHourglassData)
            .catch((err) => console.error('시련의 모래 획득 실패', err))
        }}
        onToggleCompleted={(checked) => {
          if (checked) {
            completeHalHourglass(characterId)
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

/**
 * 위젯의 실제 생김새를 주어진 픽셀 크기로 그린다. 배너는 실제 컴포넌트를 축소해서 보여주고,
 * 아직 구현되지 않은 위젯은 크기 비율이 맞는 자리표시(placeholder)로 대체한다.
 * 배치/미리보기 용도(팔레트, 편집 그리드)에서는 interactive를 꺼서 내부 상호작용을 막는다.
 *
 * Default Value 위젯(배너, 가디언, 쿠르잔 전선)은 카드에 귀속된 실제 캐릭터가 있을 때만 렌더링되며
 * (아래 placeholder 분기 참고), 이 시점부터는 항상 실제 캐릭터 API로 상태를 읽고 쓴다.
 * 텍스트 등 Additional Value 위젯은 아직 커스텀 위젯 API가 없어 이 컴포넌트 인스턴스의 로컬
 * state로만 보관한다.
 */
export function WidgetVisual({
  kind,
  width,
  height,
  interactive = false,
  characterName,
  customData,
  onCustomDataChange,
  onCheckboxToggle,
  raid,
  raidExcludedKeys,
  onRaidGateToggle,
  onRaidMoreRewardToggle,
  onRaidTargetChange,
  onRaidGoldRewardChange,
  className,
}: WidgetVisualProps) {
  const catalogItem = WIDGET_CATALOG.find((item) => item.kind === kind)
  const disabledClassName = !interactive && 'pointer-events-none'

  // characterName이 넘어오지 않으면(팔레트 미리보기 등) 특정 카드에 귀속되지 않은 것이므로
  // 항상 예시 mock 데이터를 보여준다. 넘어왔다면 실제 캐릭터 API 목록(CharacterDirectoryContext)에서
  // 그 이름을 조회한다 — 등록된 실제 캐릭터일 때만 값이 있다.
  const { findByName, refresh } = useCharacterDirectory()
  const isBoundToCard = characterName !== undefined
  const record = characterName ? findByName(characterName) : undefined

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = () => {
    if (!record) {
      // 카드에 귀속되지 않은 미리보기(예시 데이터)라 새로고침할 실제 캐릭터가 없다 — 스핀만 보여준다.
      setIsRefreshing(true)
      window.setTimeout(() => setIsRefreshing(false), 1200)
      return
    }

    setIsRefreshing(true)
    refresh(record.id)
      .catch((err) => console.error('캐릭터 정보 새로고침 실패', err))
      .finally(() => setIsRefreshing(false))
  }

  // Additional Value 위젯(text/textCheckbox)의 텍스트 입력. 입력 중엔 로컬 상태로만 부드럽게
  // 반영하고, 포커스가 벗어날 때만 onCustomDataChange로 저장한다(키 입력마다 API를 부르지 않기 위함).
  // customData?.text의 "값"만 의존성으로 둬서, 저장 후 돌아오는 동일한 값으로는 다시 리셋되지 않게 한다.
  const [textDraft, setTextDraft] = useState((customData?.text as string) ?? '')
  useEffect(() => {
    setTextDraft((customData?.text as string) ?? '')
  }, [customData?.text])

  const [isTextCheckboxSettingsOpen, setIsTextCheckboxSettingsOpen] = useState(false)
  const [isLinkIconSettingsOpen, setIsLinkIconSettingsOpen] = useState(false)
  const [isAbilityStoneOpen, setIsAbilityStoneOpen] = useState(false)

  const [isRaidSettingsOpen, setIsRaidSettingsOpen] = useState(false)

  // 카드에는 배치됐지만 (1) 아직 캐릭터 이름이 설정되지 않았거나 (2) 설정한 이름이 조회되지
  // 않는 경우, Default Value 위젯은 실제 데이터 대신 안내만 보여준다 (docs/db_schema.typ:
  // Default Value는 캐릭터에 종속되므로 캐릭터를 특정할 수 없으면 노출할 데이터가 없다).
  // 가디언/쿠르잔 전선 바운드 컴포넌트는 이 분기를 통과한 뒤에만 렌더링되므로 record가 항상 있다.
  if (isBoundToCard && !record && DEFAULT_VALUE_KINDS.includes(kind)) {
    return (
      <div
        style={{ width, height }}
        className={cn(
          'flex select-none flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 bg-primary/10 px-3 text-center text-primary',
          disabledClassName,
          className,
        )}
      >
        <span className="text-xs font-medium">{catalogItem?.label ?? kind}</span>
        <span className="text-[10px] font-normal text-primary/70">
          {characterName.trim()
            ? '등록되지 않은 캐릭터입니다'
            : '위젯 설정에서 캐릭터 이름을 입력해주세요'}
        </span>
      </div>
    )
  }

  const bannerCharacter = record ?? mockCharacter

  if (kind === 'banner') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_NATIVE_WIDTH}
        nativeHeight={BANNER_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <CharacterBanner character={bannerCharacter} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      </ScaleToFit>
    )
  }

  if (kind === 'bannerCompact') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_COMPACT_NATIVE_WIDTH}
        nativeHeight={BANNER_COMPACT_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <CharacterBannerCompact
          character={bannerCharacter}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'bannerDetailed') {
    return (
      <ScaleToFit
        nativeWidth={BANNER_DETAILED_NATIVE_WIDTH}
        nativeHeight={BANNER_DETAILED_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <CharacterBannerDetailed character={bannerCharacter} isRefreshing={isRefreshing} onRefresh={handleRefresh} />
      </ScaleToFit>
    )
  }

  if (kind === 'kurzanFrontline') {
    // record는 위 placeholder 분기에서 이미 보장됨(guardian/kurzanFrontline은 DEFAULT_VALUE_KINDS에 포함).
    return (
      <ScaleToFit
        nativeWidth={KURZAN_FRONTLINE_NATIVE_WIDTH}
        nativeHeight={KURZAN_FRONTLINE_NATIVE_HEIGHT}
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

  if (kind === 'guardian') {
    return (
      <ScaleToFit
        nativeWidth={GUARDIAN_NATIVE_WIDTH}
        nativeHeight={GUARDIAN_NATIVE_HEIGHT}
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

  if (kind === 'paradise') {
    // record는 위 placeholder 분기에서 이미 보장됨(paradise가 DEFAULT_VALUE_KINDS에 포함).
    return (
      <ScaleToFit
        nativeWidth={PARADISE_NATIVE_WIDTH}
        nativeHeight={PARADISE_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <ParadiseWidgetBound
          key={record!.id}
          characterId={record!.id}
          characterNameForModal={bannerCharacter.characterName}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'ebonyCube') {
    // record는 위 placeholder 분기에서 이미 보장됨(ebonyCube가 DEFAULT_VALUE_KINDS에 포함).
    return (
      <ScaleToFit
        nativeWidth={EBONY_CUBE_NATIVE_WIDTH}
        nativeHeight={EBONY_CUBE_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <EbonyCubeWidgetBound
          key={record!.id}
          characterId={record!.id}
          characterNameForModal={bannerCharacter.characterName}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'halHourglass') {
    // record는 위 placeholder 분기에서 이미 보장됨(halHourglass가 DEFAULT_VALUE_KINDS에 포함).
    return (
      <ScaleToFit
        nativeWidth={HAL_HOURGLASS_NATIVE_WIDTH}
        nativeHeight={HAL_HOURGLASS_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <HalHourglassWidgetBound
          key={record!.id}
          characterId={record!.id}
          characterNameForModal={bannerCharacter.characterName}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'raid') {
    // 특정 위젯 인스턴스에 묶이지 않은 미리보기(팔레트 등)는 raid가 전달되지 않으므로 예시 데이터를 쓴다.
    const raidData = raid ?? MOCK_RAID_PREVIEW
    const raidDefinition = RAID_CATALOG.find((candidate) => candidate.key === raidData.raidKey)
    const difficultyDefinition = raidDefinition?.difficulties.find(
      (candidate) => candidate.key === raidData.difficultyKey,
    )
    const gateViews: RaidGateView[] = raidData.gates.map((gate, index) => ({
      cleared: gate.cleared,
      moreRewardEnabled: gate.moreRewardEnabled,
      goldReward: difficultyDefinition?.gates[index]?.goldReward ?? 0,
      boundGoldReward: difficultyDefinition?.gates[index]?.boundGoldReward ?? 0,
    }))
    const hasClearedGate = raidData.gates.some((gate) => gate.cleared)

    return (
      <>
        <ScaleToFit
          nativeWidth={RAID_NATIVE_WIDTH}
          nativeHeight={RAID_NATIVE_HEIGHT}
          width={width}
          height={height}
          className={cn('select-none rounded-xl', disabledClassName, className)}
        >
          <RaidWidget
            raidName={raidDefinition?.name ?? raidData.raidKey}
            difficultyName={difficultyDefinition?.name ?? raidData.difficultyKey}
            gates={gateViews}
            goldRewardEnabled={raidData.goldRewardEnabled}
            onToggleGateCleared={onRaidGateToggle}
            onToggleMoreReward={onRaidMoreRewardToggle}
            onOpenSettings={() => setIsRaidSettingsOpen(true)}
          />
        </ScaleToFit>
        <RaidTargetModal
          open={isRaidSettingsOpen}
          onClose={() => setIsRaidSettingsOpen(false)}
          title={`${bannerCharacter.characterName}의 레이드 설정`}
          characterItemLevel={bannerCharacter.itemLevel}
          excludedRaidKeys={raidExcludedKeys}
          initialRaidKey={raidData.raidKey}
          initialDifficultyKey={raidData.difficultyKey}
          locked={hasClearedGate}
          onConfirm={(raidKey, difficultyKey) => {
            onRaidTargetChange?.(raidKey, difficultyKey)
            setIsRaidSettingsOpen(false)
          }}
          goldRewardEnabled={raidData.goldRewardEnabled}
          onGoldRewardChange={(enabled) => onRaidGoldRewardChange?.(enabled)}
        />
      </>
    )
  }

  if (kind === 'text') {
    return (
      <ScaleToFit
        nativeWidth={TEXT_NATIVE_WIDTH}
        nativeHeight={TEXT_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <TextWidget
          value={textDraft}
          onChange={setTextDraft}
          onBlur={() => onCustomDataChange?.({ text: textDraft })}
        />
      </ScaleToFit>
    )
  }

  if (kind === 'textCheckbox') {
    const isChecked = Boolean(customData?.isChecked)
    const text = (customData?.text as string | undefined) ?? ''
    const resetDays = (customData?.resetDays as TextCheckboxResetDays | undefined) ?? RESET_DAYS_OFF
    const remainingCount =
      typeof customData?.remainingCount === 'number' ? (customData.remainingCount as number) : null
    return (
      <>
        <ScaleToFit
          nativeWidth={TEXT_CHECKBOX_NATIVE_WIDTH}
          nativeHeight={TEXT_CHECKBOX_NATIVE_HEIGHT}
          width={width}
          height={height}
          className={cn('select-none rounded-xl', disabledClassName, className)}
        >
          <TextCheckboxWidget
            text={text}
            isChecked={isChecked}
            remainingCount={remainingCount}
            onToggleChecked={onCheckboxToggle}
            onOpenSettings={() => setIsTextCheckboxSettingsOpen(true)}
          />
        </ScaleToFit>
        <TextCheckboxSettingsModal
          open={isTextCheckboxSettingsOpen}
          onClose={() => setIsTextCheckboxSettingsOpen(false)}
          characterName={bannerCharacter.characterName}
          text={text}
          resetDays={resetDays}
          remainingCount={remainingCount}
          onSave={(value) => onCustomDataChange?.({ ...customData, ...value })}
        />
      </>
    )
  }

  if (kind === 'image') {
    const url = (customData?.url as string | null) ?? null
    return (
      <ScaleToFit
        nativeWidth={IMAGE_NATIVE_WIDTH}
        nativeHeight={IMAGE_NATIVE_HEIGHT}
        width={width}
        height={height}
        className={cn('select-none rounded-xl', disabledClassName, className)}
      >
        <ImageWidget url={url} onChangeUrl={(nextUrl) => onCustomDataChange?.({ url: nextUrl })} />
      </ScaleToFit>
    )
  }

  if (kind === 'linkIcon') {
    const url = (customData?.url as string | null) ?? null
    const label = (customData?.label as string | null) ?? null
    return (
      <>
        <ScaleToFit
          nativeWidth={LINK_ICON_NATIVE_WIDTH}
          nativeHeight={LINK_ICON_NATIVE_HEIGHT}
          width={width}
          height={height}
          className={cn('select-none rounded-xl', disabledClassName, className)}
        >
          <LinkIconWidget url={url} label={label} onOpenSettings={() => setIsLinkIconSettingsOpen(true)} />
        </ScaleToFit>
        <LinkIconSettingsModal
          open={isLinkIconSettingsOpen}
          onClose={() => setIsLinkIconSettingsOpen(false)}
          url={url}
          label={label}
          onSave={(next) => onCustomDataChange?.(next)}
        />
      </>
    )
  }

  if (kind === 'abilityStone') {
    return (
      <>
        <ScaleToFit
          nativeWidth={ABILITY_STONE_NATIVE_WIDTH}
          nativeHeight={ABILITY_STONE_NATIVE_HEIGHT}
          width={width}
          height={height}
          className={cn('select-none rounded-xl', disabledClassName, className)}
        >
          <AbilityStoneWidget onOpen={() => setIsAbilityStoneOpen(true)} />
        </ScaleToFit>
        <AbilityStoneModal open={isAbilityStoneOpen} onClose={() => setIsAbilityStoneOpen(false)} />
      </>
    )
  }

  return (
    <div
      style={{ width, height }}
      className={cn(
        'flex select-none items-center justify-center rounded-lg border-2 border-dashed text-center text-xs font-medium leading-tight',
        disabledClassName,
        catalogItem?.category === 'default'
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-secondary/40 bg-secondary/10 text-secondary',
        className,
      )}
    >
      {catalogItem?.label ?? kind}
    </div>
  )
}
