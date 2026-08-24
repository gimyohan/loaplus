import { ApiError, apiFetch } from '@/lib/api'
import type { MarketItemDailyStat, MarketItemPrice } from '@/types/market'

const MARKET_ERROR_MESSAGES: Record<string, string> = {
  item_not_found: '아직 수집되지 않은 아이템입니다. 아이템 ID를 확인해 주세요.',
  invalid_request: '아이템 ID가 올바르지 않습니다.',
  lostark_key_required: '로스트아크 API 키를 등록해야 새로고침할 수 있습니다.',
  lostark_key_invalid: '등록된 로스트아크 API 키가 유효하지 않습니다.',
  lostark_shared_key_throttled: '공용 API 키 사용량이 많습니다. 잠시 후 다시 시도해 주세요.',
  lostark_api_rate_limited: '로스트아크 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  lostark_api_unavailable: '로스트아크 API에 접속할 수 없습니다. 잠시 후 다시 시도해 주세요.',
}

export function describeMarketApiError(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return MARKET_ERROR_MESSAGES[err.code] ?? '거래소 시세 조회에 실패했습니다.'
  }
  return '거래소 시세 조회에 실패했습니다.'
}

/** 현재 최소 판매가 조회. updatedAt이 30분 넘게 지났으면 서버가 조용히 암묵적 갱신을 시도한 뒤 응답한다. */
export async function fetchMarketItem(itemId: number): Promise<MarketItemPrice> {
  return apiFetch<MarketItemPrice>(`/api/market/items/${itemId}`)
}

export async function fetchMarketItemHistory(
  itemId: number,
  from: string,
  to: string,
): Promise<MarketItemDailyStat[]> {
  return apiFetch<MarketItemDailyStat[]>(
    `/api/market/items/${itemId}/history?from=${from}&to=${to}`,
  )
}

/** 명시적 새로고침(단일). 키가 없거나 공용 키가 쓰로틀 중이면 ApiError를 던진다. */
export async function refreshMarketItem(itemId: number): Promise<MarketItemPrice> {
  return apiFetch<MarketItemPrice>(`/api/market/items/${itemId}/refresh`, { method: 'POST' })
}

/** 명시적 새로고침(묶음, 최대 50개). 캐시가 없거나 못 찾은 itemId는 응답 배열에서 조용히 생략된다. */
export async function refreshMarketItemsBatch(itemIds: number[]): Promise<MarketItemPrice[]> {
  return apiFetch<MarketItemPrice[]>('/api/market/items/refresh-batch', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
}
