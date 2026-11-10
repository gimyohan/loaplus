import { apiFetch } from '@/lib/api'
import type { PlacedWidget } from '@/types/widget'

/** 내 캐릭터 카드가 나열되는 순서(Characters.display_order 오름차순 characterId 배열). */
export async function fetchCardOrder(): Promise<string[]> {
  return apiFetch<string[]>('/api/dashboards')
}

/**
 * 카드 순서를 통째로 저장한다. 백엔드는 내 계정의 캐릭터 id 전체를 정확히 한 번씩만
 * 포함해야 받아준다(추가/누락 시 400). 드래그로 두 카드만 맞바꾸는 경우는 이 전체 재계산 대신
 * swapCardOrder를 쓴다 — 지금은 호출부가 없지만, 나중에 자유 재배치(끼워넣기) UI를 붙일 때 쓰면 된다.
 */
export async function saveCardOrder(characterIds: string[]): Promise<string[]> {
  return apiFetch<string[]>('/api/dashboards', {
    method: 'PUT',
    body: JSON.stringify({ characterIds }),
  })
}

/**
 * 카드 두 개의 순서만 맞바꾼다(display_order 교환). 끼워넣기가 아니라 스왑이라 그 사이
 * 카드들의 순서는 건드리지 않는다 — Roster 탭의 드래그 앤 드롭 재배치에 쓴다(docs/api.typ 참고).
 */
export async function swapCardOrder(characterIdA: string, characterIdB: string): Promise<string[]> {
  return apiFetch<string[]>('/api/dashboards/swap', {
    method: 'PATCH',
    body: JSON.stringify({ characterIdA, characterIdB }),
  })
}

export interface WidgetLayout {
  /** 위→아래 순서 */
  widgets: PlacedWidget[]
}

/** 순서 배열의 한 칸: 이미 저장된 위젯은 id만, 새로 추가하는 위젯은 kind(+ 초기 customData). */
export type WidgetOrderEntry = { id: string } | { kind: PlacedWidget['kind']; customData?: Record<string, unknown> }

export async function fetchWidgetLayout(characterId: string): Promise<WidgetLayout> {
  return apiFetch<WidgetLayout>(`/api/dashboards/${characterId}/widgets`)
}

/**
 * 카드의 위젯 목록을 위→아래 순서 배열로 통째로 맞춘다. id로 넘긴 위젯은 그대로(순서만 변경),
 * kind로 넘긴 항목은 새로 만들고, 배열에서 빠진 기존 위젯은 서버가 지운다. 레이드 위젯은 여기서
 * 만들거나 지울 수 없다(POST/DELETE .../raids 전용) — 기존 레이드 위젯은 전부 id로 포함해야 한다.
 */
export async function saveWidgetOrder(characterId: string, widgets: WidgetOrderEntry[]): Promise<WidgetLayout> {
  return apiFetch<WidgetLayout>(`/api/dashboards/${characterId}/widgets`, {
    method: 'PUT',
    body: JSON.stringify({ widgets }),
  })
}
