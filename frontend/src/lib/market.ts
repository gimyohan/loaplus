import { ApiError, apiFetch } from '@/lib/api'
import type { MarketHistoryPeriod, MarketItemHistoryPoint, MarketItemSearchResult } from '@/types/market'

const MARKET_ERROR_MESSAGES: Record<string, string> = {
  invalid_request: '검색어 또는 기간이 올바르지 않습니다.',
}

export function describeMarketApiError(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return MARKET_ERROR_MESSAGES[err.code] ?? '거래소 시세 조회에 실패했습니다.'
  }
  return '거래소 시세 조회에 실패했습니다.'
}

/** 아이템 이름으로 검색(부분일치). Market_Item_Daily_Stats만 조회하므로 API 키 없이도 항상 가능하다. */
export async function searchMarketItems(search: string): Promise<MarketItemSearchResult[]> {
  return apiFetch<MarketItemSearchResult[]>(`/api/market/items?search=${encodeURIComponent(search)}`)
}

export async function fetchMarketItemHistory(
  itemId: number,
  from: string,
  to: string,
  period: MarketHistoryPeriod = 'daily',
): Promise<MarketItemHistoryPoint[]> {
  return apiFetch<MarketItemHistoryPoint[]>(
    `/api/market/items/${itemId}/history?from=${from}&to=${to}&period=${period}`,
  )
}
