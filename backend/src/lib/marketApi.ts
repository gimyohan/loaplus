import { LostarkApiError } from './lostarkApi.js'

const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com'

function handleCommonErrors(response: Response): void {
  if (response.status === 401) {
    throw new LostarkApiError('Invalid Lost Ark API key', 'unauthorized')
  }
  if (response.status === 429) {
    throw new LostarkApiError('Lost Ark API rate limit exceeded', 'rate_limited')
  }
  if (!response.ok) {
    throw new LostarkApiError(`Lost Ark API request failed: ${response.status}`, 'unknown')
  }
}

export interface MarketCategory {
  code: number
  codeName: string
  subs: MarketCategory[]
}

interface RawMarketCategory {
  Code: number
  CodeName: string
  Subs: RawMarketCategory[]
}

function toMarketCategory(raw: RawMarketCategory): MarketCategory {
  return { code: raw.Code, codeName: raw.CodeName, subs: (raw.Subs ?? []).map(toMarketCategory) }
}

export async function fetchMarketCategories(apiKey: string): Promise<MarketCategory[]> {
  const response = await fetch(`${LOSTARK_API_BASE_URL}/markets/options`, {
    headers: { Authorization: `bearer ${apiKey}` },
  })
  handleCommonErrors(response)

  const body = (await response.json()) as { Categories: RawMarketCategory[] }
  return body.Categories.map(toMarketCategory)
}

/** 카테고리 트리에서 Subs가 없는(=검색에 바로 쓸 수 있는) leaf 카테고리 코드만 펼쳐 반환한다. */
export function flattenLeafCategoryCodes(categories: MarketCategory[]): number[] {
  const leaves: number[] = []
  for (const category of categories) {
    if (category.subs.length === 0) {
      leaves.push(category.code)
    } else {
      leaves.push(...flattenLeafCategoryCodes(category.subs))
    }
  }
  return leaves
}

export interface MarketSearchItem {
  itemId: number
  itemName: string
  grade: string
  icon: string
  currentMinPrice: number | null
}

export interface MarketSearchPage {
  pageNo: number
  pageSize: number
  totalCount: number
  items: MarketSearchItem[]
}

interface RawMarketSearchResponse {
  PageNo: number
  PageSize: number
  TotalCount: number
  Items: Array<{ Id: number; Name: string; Grade: string; Icon: string; CurrentMinPrice: number | null }> | null
}

async function postMarketItemSearch(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<MarketSearchPage> {
  const response = await fetch(`${LOSTARK_API_BASE_URL}/markets/items`, {
    method: 'POST',
    headers: { Authorization: `bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  handleCommonErrors(response)

  const raw = (await response.json()) as RawMarketSearchResponse
  return {
    pageNo: raw.PageNo,
    pageSize: raw.PageSize,
    totalCount: raw.TotalCount,
    items: (raw.Items ?? []).map((item) => ({
      itemId: item.Id,
      itemName: item.Name,
      grade: item.Grade,
      icon: item.Icon,
      currentMinPrice: item.CurrentMinPrice,
    })),
  }
}

/** PageNo는 0부터 시작한다. PageSize는 Open API가 항상 10으로 고정한다(요청으로 조정 불가, 확인됨). */
export async function searchMarketItems(
  apiKey: string,
  params: { categoryCode: number; pageNo: number },
): Promise<MarketSearchPage> {
  return postMarketItemSearch(apiKey, {
    Sort: 'GRADE',
    CategoryCode: params.categoryCode,
    PageNo: params.pageNo,
    SortCondition: 'ASC',
  })
}

/**
 * Open API에 itemId 단독 조회가 없어(CurrentMinPrice는 검색 응답에만 있음), categoryCode+itemName으로
 * 좁혀 재검색해 단일 아이템의 현재 최소 판매가를 갱신하는 용도. CategoryCode는 필수 파라미터로 확인됨(0/생략 시 400).
 */
export async function findMarketItemByNameInCategory(
  apiKey: string,
  params: { categoryCode: number; itemName: string; itemId: number },
): Promise<MarketSearchItem | null> {
  const page = await postMarketItemSearch(apiKey, {
    Sort: 'GRADE',
    CategoryCode: params.categoryCode,
    ItemName: params.itemName,
    PageNo: 0,
    SortCondition: 'ASC',
  })
  return page.items.find((item) => item.itemId === params.itemId) ?? null
}

export interface MarketItemDailyStatEntry {
  /** "YYYY-MM-DD" 형식 그대로. 배열의 첫 원소는 아직 하루가 끝나지 않은 오늘 날짜의 미확정 값이다. */
  date: string
  avgPrice: number
  tradeCount: number
}

export interface MarketItemStatsResult {
  itemName: string
  stats: MarketItemDailyStatEntry[]
}

interface RawMarketItemStatsEntry {
  Name: string
  Stats: Array<{ Date: string; AvgPrice: number; TradeCount: number }>
}

/** 존재하지 않는 itemId는 404가 아니라 200 + body `null`로 응답한다(캐릭터 배너 조회와 동일한 패턴). */
export async function fetchMarketItemStats(
  apiKey: string,
  itemId: number,
): Promise<MarketItemStatsResult | null> {
  const response = await fetch(`${LOSTARK_API_BASE_URL}/markets/items/${itemId}`, {
    headers: { Authorization: `bearer ${apiKey}` },
  })
  handleCommonErrors(response)

  const body = (await response.json()) as RawMarketItemStatsEntry[] | null
  const entry = body?.[0]
  if (!entry) {
    return null
  }

  return {
    itemName: entry.Name,
    stats: entry.Stats.map((stat) => ({
      date: stat.Date,
      avgPrice: stat.AvgPrice,
      tradeCount: stat.TradeCount,
    })),
  }
}
