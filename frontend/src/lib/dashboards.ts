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

interface WidgetLayoutDto {
  columns: number
  rows: number
  widgets: PlacedWidget[]
}

export interface WidgetLayout {
  columns: number
  rows: number
  widgets: PlacedWidget[]
}

export async function fetchWidgetLayout(characterId: string): Promise<WidgetLayout> {
  return apiFetch<WidgetLayoutDto>(`/api/dashboards/${characterId}/widgets`)
}

/** 그리드 크기 + 위젯 배치를 통째로 교체 저장한다(부분 갱신 없음). */
export async function saveWidgetLayout(
  characterId: string,
  layout: { columns: number; rows: number; widgets: Omit<PlacedWidget, 'id'>[] },
): Promise<WidgetLayout> {
  return apiFetch<WidgetLayoutDto>(`/api/dashboards/${characterId}/widgets`, {
    method: 'PUT',
    body: JSON.stringify(layout),
  })
}
