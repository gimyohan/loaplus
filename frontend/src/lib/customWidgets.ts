import { apiFetch } from '@/lib/api'
import type { PlacedWidget } from '@/types/widget'

/**
 * Additional Value 위젯(text/textCheckbox/counter/image/linkIcon) 하나의 내용(customData) 편집 전용 API.
 * 순서·추가·삭제는 카드 전체를 순서 배열로 저장하는 PUT /api/dashboards/{characterId}/widgets
 * (lib/dashboards.ts)로 처리하고, 이 파일의 함수들은 위젯 하나의 내용만 바로 바꿀 때(텍스트 입력,
 * 체크박스 토글, 이미지 크기 등) 쓴다(docs/api.md 참고).
 */
export async function updateCustomWidget(
  widgetId: string,
  input: { customData: Record<string, unknown> },
): Promise<PlacedWidget> {
  return apiFetch<PlacedWidget>(`/api/widgets/custom/${widgetId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

/** textCheckbox 위젯의 체크 상태만 갱신한다(customData의 다른 필드는 서버가 그대로 유지). */
export async function checkCustomWidget(widgetId: string, isChecked: boolean): Promise<PlacedWidget> {
  return apiFetch<PlacedWidget>(`/api/widgets/custom/${widgetId}/check`, {
    method: 'PATCH',
    body: JSON.stringify({ isChecked }),
  })
}

/** 카운터 위젯의 숫자만 서버 저장값 기준으로 1 감소시킨다(customData의 text는 그대로 유지). */
export async function decrementCounterWidget(widgetId: string): Promise<PlacedWidget> {
  return apiFetch<PlacedWidget>(`/api/widgets/custom/${widgetId}/decrement`, { method: 'PATCH' })
}
