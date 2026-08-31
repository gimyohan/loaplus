import type { Dispatch, SetStateAction } from 'react'

import { runOptimistic } from '@/lib/optimistic'
import {
  clearRaidGate,
  createRaidWidget,
  deleteRaidWidget,
  setRaidGateMoreReward,
  undoRaidGateClear,
  updateRaidGoldReward,
  updateRaidPosition,
  updateRaidTarget,
} from '@/lib/raids'
import raidCatalogData from '@/data/raidCatalog.json'
import type { RaidTargetSummary } from '@/types/raid'
import type { PlacedWidget } from '@/types/widget'

const RAID_CATALOG = raidCatalogData.raids

/** raidKey/difficultyKey를 "{레이드명} {난이도명}" 표시 문구로 바꾼다. 카탈로그에 없으면 원본 키를 그대로 쓴다. */
function describeRaidTarget(raidKey: string, difficultyKey: string): string {
  const raid = RAID_CATALOG.find((candidate) => candidate.key === raidKey)
  const difficulty = raid?.difficulties.find((candidate) => candidate.key === difficultyKey)
  return `${raid?.name ?? raidKey} ${difficulty?.name ?? difficultyKey}`
}

/**
 * raid는 다른 위젯과 달리 (1) 별도 API(POST/DELETE/PATCH .../raids)로만 생성·이동·삭제되고
 * (2) 관문 완료/보상 설정 같은 자기만의 상호작용이 있어서, `WidgetDashboard`의 범용 배치 핸들러
 * (placeWidgetAt/moveWidgetTo/removeWidget/applyTemplateLayout)마다 raid 전용 분기가 흩어져
 * 있었다. 그 분기들이 실제로 하는 일(어느 API를 부를지, 로컬 상태를 어떻게 갱신할지)을 이 훅
 * 하나로 모은다 — 다만 "이 위젯 종류는 이 벌크 작업에서 제외한다"는 사실 자체는 각 범용 함수가
 * 여전히 알아야 하므로(raid는 bulk 저장 body에서 빠진다, docs/api.typ 참고) 그 지점의 분기까지
 * 없애지는 않는다.
 */
export function useRaidWidgetActions(
  widgets: PlacedWidget[],
  setWidgets: Dispatch<SetStateAction<PlacedWidget[]>>,
  boundCharacterId: string | undefined,
) {
  // 레이드 관문 완료 체크박스 토글. 체크(완료)는 서버가 앞선 미완료 관문까지 연쇄 완료하고,
  // 해제(미완료)는 전용 엔드포인트가 없어 로그 롤백을 재사용한다(뒤 관문도 함께 미완료가 됨) —
  // 두 경우 모두 서버 응답을 기다리지 않고 먼저 연쇄 규칙대로 로컬 상태를 낙관적으로 갱신한다.
  // runOptimistic의 revertUpdate가 실패 시(예: 되돌릴 로그를 못 찾음) 원래 gates로 되돌려준다 —
  // 안 그러면 체크박스가 당장은 바뀐 것처럼 보이다가 다음 새로고침에서야 원상태로 "저장이 안 된"
  // 것처럼 보이는 혼란이 생긴다. 체크(연쇄 완료) 쪽은 API 호출이 여러 번(관문 순서대로) 이어지는
  // 루프지만, runOptimistic 입장에선 apiCall 하나가 그 루프를 감싼 것뿐이라 그대로 들어맞는다.
  const toggleRaidGateCleared = (widgetId: string, gateIndex: number, cleared: boolean) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !widget.raid || !widget.raid.raidKey || !widget.raid.difficultyKey || !boundCharacterId) return
    const raidId = widget.raidId
    const raidKey = widget.raid.raidKey
    const difficultyKey = widget.raid.difficultyKey
    const previousGates = widget.raid.gates

    const revertUpdate = (prev: PlacedWidget[]) =>
      prev.map((w) => (w.id === widgetId && w.raid ? { ...w, raid: { ...w.raid, gates: previousGates } } : w))

    if (cleared) {
      // 연쇄 완료(gateIndex보다 앞선 미완료 관문까지 함께 완료)는 서버가 아니라 FE가 계산한다 —
      // 서버는 관문 하나만 처리하는 단순 연산이고(앞선 관문이 미완료면 409로 거부), 관문 순서대로
      // 이 호출을 여러 번 반복해서 연쇄를 구현한다. 그래야 관문마다 Action_Logs가 자기 번호가
      // 정확히 담긴 description으로 하나씩 남는다(docs/widgets.typ "레이드" 참고).
      const pendingIndexes = previousGates
        .map((gate, index) => ({ gate, index }))
        .filter(({ gate, index }) => index <= gateIndex && !gate.cleared)
        .map(({ index }) => index)

      void runOptimistic<PlacedWidget[], RaidTargetSummary | undefined>(
        setWidgets,
        (prev) =>
          prev.map((w) =>
            w.id === widgetId && w.raid
              ? { ...w, raid: { ...w.raid, gates: w.raid.gates.map((g, i) => (i <= gateIndex ? { ...g, cleared: true } : g)) } }
              : w,
          ),
        revertUpdate,
        async () => {
          let latestRaid: RaidTargetSummary | undefined
          for (const index of pendingIndexes) {
            const description = `${describeRaidTarget(raidKey, difficultyKey)} ${index + 1}관문`
            const raid = await clearRaidGate(boundCharacterId, raidId, index, description)
            if (raid) latestRaid = raid
          }
          return latestRaid
        },
        // latestRaid가 없으면(예: 이미 전부 완료된 관문만 있었던 경우) 재조정할 응답이 없으므로
        // 낙관적으로 반영해둔 값을 그대로 둔다.
        (response) => (prev) =>
          response ? prev.map((w) => (w.id === widgetId ? { ...w, raid: response } : w)) : prev,
        { errorLabel: '레이드 관문 완료 처리 실패' },
      )
      return
    }

    void runOptimistic<PlacedWidget[], void>(
      setWidgets,
      (prev) =>
        prev.map((w) =>
          w.id === widgetId && w.raid
            ? { ...w, raid: { ...w.raid, gates: w.raid.gates.map((g, i) => (i >= gateIndex ? { ...g, cleared: false } : g)) } }
            : w,
        ),
      revertUpdate,
      () => undoRaidGateClear(boundCharacterId, raidId, gateIndex),
      () => (prev) => prev,
      { reconcileOnSuccess: false, errorLabel: '레이드 관문 되돌리기 실패' },
    )
  }

  // 레이드 관문 '더보기' 토글. 완료 여부와 무관한 단순 플래그라 연쇄 규칙이 없다.
  const toggleRaidGateMoreReward = (widgetId: string, gateIndex: number, enabled: boolean) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !widget.raid || !boundCharacterId) return
    const raidId = widget.raidId
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === widgetId && w.raid
          ? {
              ...w,
              raid: { ...w.raid, gates: w.raid.gates.map((g, i) => (i === gateIndex ? { ...g, moreRewardEnabled: enabled } : g)) },
            }
          : w,
      ),
    )
    setRaidGateMoreReward(boundCharacterId, raidId, gateIndex, enabled)
      .then((raid) => setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, raid } : w))))
      .catch((err) => console.error('레이드 더보기 설정 저장 실패', err))
  }

  // 레이드 목표(레이드/난이도) 변경. 완료된 관문이 있으면 서버가 409를 반환하므로 그대로 던져
  // RaidTargetModal이 실패를 알 수 있게 한다.
  const changeRaidTarget = (widgetId: string, raidKey: string, difficultyKey: string) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !boundCharacterId) return
    updateRaidTarget(boundCharacterId, widget.raidId, { raidKey, difficultyKey })
      .then((raid) => setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, raid } : w))))
      .catch((err) => console.error('레이드 목표 변경 실패', err))
  }

  // 골드 획득 허용/거부 토글. 목표 변경과 동일하게 완료된 관문이 있으면 서버가 409를 반환하므로
  // (RaidTargetModal이 locked일 때 스위치를 비활성화해 평소엔 이 경로를 안 타지만) 별도로 즉시 저장한다.
  const changeRaidGoldReward = (widgetId: string, enabled: boolean) => {
    const widget = widgets.find((w) => w.id === widgetId)
    if (!widget?.raidId || !boundCharacterId) return
    updateRaidGoldReward(boundCharacterId, widget.raidId, enabled)
      .then((raid) => setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, raid } : w))))
      .catch((err) => console.error('레이드 골드 획득 설정 변경 실패', err))
  }

  // 위젯 자신을 뺀, 이미 다른 레이드 위젯이 쓰고 있는 레이드 키 목록. 같은 레이드를 난이도만
  // 바꿔서 중복으로 추가하지 못하게 RaidTargetModal에 넘긴다.
  const raidExcludedKeysFor = (widgetId: string) =>
    widgets
      .filter((w) => w.kind === 'raid' && w.id !== widgetId && w.raid?.raidKey)
      .map((w) => w.raid!.raidKey!)

  // 레이드는 서버가 raidId를 생성해줘야 위젯이 성립하므로(POST .../raids) 다른 위젯처럼 임시
  // uuid로 즉시 로컬 생성할 수 없다 — 목표는 일단 고르지 않고(서버가 아이템 레벨 기준 자동 추천)
  // 바로 추가한 뒤, 톱니바퀴(RaidTargetModal)에서 원하는 목표로 바꾸게 한다.
  const createRaidAt = (x: number, y: number, w: number, h: number) => {
    if (!boundCharacterId) return
    createRaidWidget(boundCharacterId, { x, y, w, h })
      .then((widget) => setWidgets((prev) => [...prev, widget]))
      .catch((err) => console.error('레이드 위젯 생성 실패', err))
  }

  // 레이드는 bulk 저장(persistLayout)이 아예 body에서 제외하므로(docs/api.typ 참고), 위치 이동은
  // 전용 PATCH .../raids/{raidId}/position로 저장한다.
  const moveRaid = (widget: PlacedWidget, x: number, y: number) => {
    if (!widget.raidId || !boundCharacterId) return
    updateRaidPosition(boundCharacterId, widget.raidId, { x, y, w: widget.w, h: widget.h })
      .then((updated) => setWidgets((prev) => prev.map((w) => (w.id === widget.id ? updated : w))))
      .catch((err) => console.error('레이드 위치 저장 실패', err))
  }

  // 레이드는 bulk 저장이 아니라 전용 DELETE로만 슬롯(Character_Raids 행)이 실제로 지워진다
  // (docs/api.typ 참고) — persistLayout은 raid kind를 body에서 아예 제외하기 때문이다.
  const deleteRaid = (widget: PlacedWidget) => {
    if (!widget.raidId || !boundCharacterId) return
    deleteRaidWidget(boundCharacterId, widget.raidId).catch((err) => console.error('레이드 위젯 삭제 실패', err))
  }

  // 템플릿 적용/초기화 — 기존 레이드 위젯을 전부 지운 뒤(진행 상태도 함께 사라진다 — 코드는
  // 종류·위치만 담고 진행 상태는 담지 않으므로 되살릴 수 없다) 새 항목 수만큼 목표 없는 빈 슬롯을
  // 만든다. boundCharacterId가 없으면(아직 캐릭터 미귀속) 아무 것도 하지 않는다.
  const recreateRaidWidgets = (
    existing: PlacedWidget[],
    entries: Array<{ x: number; y: number; w: number; h: number }>,
  ): Promise<PlacedWidget[]> => {
    if (!boundCharacterId) return Promise.resolve([])
    return Promise.all(existing.map((w) => deleteRaidWidget(boundCharacterId, w.raidId!))).then(() =>
      Promise.all(entries.map((entry) => createRaidWidget(boundCharacterId, entry))),
    )
  }

  return {
    toggleRaidGateCleared,
    toggleRaidGateMoreReward,
    changeRaidTarget,
    changeRaidGoldReward,
    raidExcludedKeysFor,
    createRaidAt,
    moveRaid,
    deleteRaid,
    recreateRaidWidgets,
  }
}
