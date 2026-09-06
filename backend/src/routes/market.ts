import type { MarketItemCurrentPrice, MarketItemDailyStat } from '@prisma/client'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { LostarkApiError } from '../lib/lostarkApi.js'
import { checkSharedKeyThrottle, resolveLostarkApiKey } from '../lib/lostarkKeyResolution.js'
import { findMarketItemByNameInCategory, searchMarketItems } from '../lib/marketApi.js'
import { requireAuth, requirePremium } from '../lib/session.js'

// docs/market_price.typ 파이프라인 B: 30분을 넘기면 조회 시점에 암묵적 갱신을 트리거한다.
const STALE_THRESHOLD_MS = 30 * 60 * 1000

// docs/market_price.typ "묶음(세트) 갱신 최적화" 참고.
const MAX_BATCH_ITEM_IDS = 50
const CATEGORY_PAGE_WALK_CAP = 20

const historyQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  // 기본값 daily — 기존 클라이언트(period 파라미터를 안 보내는)는 그대로 일별 통계를 받는다.
  period: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
})

const searchQuerySchema = z.object({
  search: z.string().trim().min(1).max(100),
})

// docs/market_price.typ "구현 전 확인 필요"에서 예고된 검색 엔드포인트. Market_Item_Daily_Stats
// (파이프라인 A 야간 배치로만 채워지는 일별 시세 통계)만 조회한다 — Market 탭은 이 테이블만
// 참조해야 하므로(사용자 확정), Open API 키나 실시간 갱신(Market_Item_Current_Prices/파이프라인 B)
// 없이도 항상 검색 가능하다.
const MAX_SEARCH_RESULTS = 20

const refreshBatchSchema = z.object({
  itemIds: z.array(z.number().int()).min(1).max(MAX_BATCH_ITEM_IDS),
})

// 여러 유저가 거의 동시에 같은 아이템을 조회해 암묵적 갱신을 각자 트리거하는 것을 막는
// 프로세스 메모리 내 가드. docs/market_price.typ "동시 갱신 경합" 참고.
const implicitRefreshInFlight = new Set<number>()

function toCurrentPriceResponse(row: MarketItemCurrentPrice) {
  return {
    itemId: row.itemId,
    itemName: row.itemName,
    currentMinPrice: row.currentMinPrice,
    updatedAt: row.updatedAt,
  }
}

function toSearchResultResponse(row: MarketItemDailyStat, icon: string | null) {
  return {
    itemId: row.itemId,
    itemName: row.itemName,
    avgPrice: row.avgPrice,
    date: row.date.toISOString().slice(0, 10),
    icon,
  }
}

export async function marketRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)
  // Market 탭(검색·히스토리)은 프리미엄 유저 전용이다 — 로스트아크 API 키 등록 여부와 무관하게
  // isPremium만 확인한다(사용자 확정, docs/subscription.typ·docs/api.typ "거래소 시세" 참고).
  // 아래 현재가/새로고침 세 라우트는 Market 탭이 쓰지 않으므로(주석 참고) 프리미엄 게이트를 걸지 않는다.
  const premiumGate = [auth, requirePremium(fastify)]

  /**
   * Market_Item_Daily_Stats에는 icon 컬럼이 없다(Market 탭은 이 테이블만 참조해야 하므로 —
   * 사용자 확정) — 이미지만 예외적으로 Market_Item_Current_Prices.icon을 itemId로 조회해
   * 붙인다(사용자 확정: "이 컬럼만 사용"). 캐시 행이 없으면(파이프라인 A/B가 아직 안 다룬
   * 아이템) null.
   */
  async function iconsByItemId(itemIds: number[]): Promise<Map<number, string | null>> {
    if (itemIds.length === 0) return new Map()
    const rows = await fastify.prisma.marketItemCurrentPrice.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, icon: true },
    })
    return new Map(rows.map((row) => [row.itemId, row.icon]))
  }

  /**
   * 암묵적 갱신(GET .../items/{itemId})용 — 실패(키 없음/공용 키 쓰로틀)는 조용히 null을
   * 반환하고 절대 응답을 보내지 않는다. 조회 자체를 막지 않는 best-effort 동작이기 때문이다
   * (docs/market_price.typ "파이프라인 B" 참고).
   */
  async function resolveApiKeyForImplicitRefresh(userId: string): Promise<string | null> {
    const resolved = await resolveLostarkApiKey(fastify.prisma, userId)
    if (!resolved) return null
    if (resolved.source === 'shared' && !checkSharedKeyThrottle(userId).allowed) return null
    return resolved.apiKey
  }

  /**
   * 명시적 새로고침(POST .../items/{itemId}/refresh)용 — 개인 키(없으면 공용 키)를 확보한다.
   * 공용 키를 쓰는 경우에만 유저당 쿨다운을 검사한다 (docs/api.typ "외부 API 연동 세부사항" 참고).
   * 실패 시 적절한 상태코드를 직접 응답하고 null을 반환한다.
   */
  async function resolveApiKeyOrRespondError(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const resolved = await resolveLostarkApiKey(fastify.prisma, request.userId!)
    if (!resolved) {
      reply.code(400).send({ error: 'lostark_key_required' })
      return null
    }
    if (resolved.source === 'shared') {
      const throttle = checkSharedKeyThrottle(request.userId!)
      if (!throttle.allowed) {
        reply.code(429).send({ error: 'lostark_shared_key_throttled', retryAfterSeconds: throttle.retryAfterSeconds })
        return null
      }
    }
    return resolved.apiKey
  }

  /**
   * category_code+item_name으로 재검색해 current_min_price를 갱신한다(Open API에 itemId 단독
   * 조회가 없음 — docs/market_price.typ 파이프라인 B 참고). 캐시 행 자체가 없으면 null.
   */
  async function refreshCurrentMinPrice(
    itemId: number,
    apiKey: string,
  ): Promise<MarketItemCurrentPrice | null> {
    const cached = await fastify.prisma.marketItemCurrentPrice.findUnique({ where: { itemId } })
    if (!cached) return null

    const found = await findMarketItemByNameInCategory(apiKey, {
      categoryCode: cached.categoryCode,
      itemName: cached.itemName,
      itemId,
    })
    if (!found || found.currentMinPrice === null) {
      // 검색으로 다시 찾지 못했거나 현재 최소 판매가가 없다면(매물 없음 등) 기존 캐시를 그대로 둔다.
      return cached
    }

    return fastify.prisma.marketItemCurrentPrice.update({
      where: { itemId },
      data: {
        currentMinPrice: found.currentMinPrice,
        itemName: found.itemName,
        grade: found.grade,
        icon: found.icon,
      },
    })
  }

  fastify.get<{ Querystring: { search?: string } }>(
    '/api/market/items',
    {
      preHandler: premiumGate,
      schema: { tags: ['Market'], summary: '아이템 이름으로 검색 (로컬 캐시 카탈로그, 부분일치, 프리미엄 전용)' },
    },
    async (request, reply) => {
      const parsed = searchQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      // itemId당 가장 최근 날짜 한 행만 남긴다(distinct는 orderBy의 앞쪽 필드를 기준으로 그룹화하므로
      // itemId를 먼저 두고, 그 안에서 date desc로 정렬해 최신 행이 뽑히게 한다) — 그 다음 화면
      // 표시 순서(이름순)로 다시 정렬한다.
      const rows = await fastify.prisma.marketItemDailyStat.findMany({
        where: { itemName: { contains: parsed.data.search, mode: 'insensitive' } },
        orderBy: [{ itemId: 'asc' }, { date: 'desc' }],
        distinct: ['itemId'],
        take: MAX_SEARCH_RESULTS,
      })
      rows.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ko'))

      const icons = await iconsByItemId(rows.map((row) => row.itemId))
      return reply.send(rows.map((row) => toSearchResultResponse(row, icons.get(row.itemId) ?? null)))
    },
  )

  fastify.get<{ Params: { itemId: string } }>(
    '/api/market/items/:itemId',
    { preHandler: auth, schema: { tags: ['Market'], summary: '거래소 현재 최소 판매가 조회 (30분 경과 시 암묵적 갱신)' } },
    async (request, reply) => {
      const itemId = Number.parseInt(request.params.itemId, 10)
      if (!Number.isInteger(itemId)) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      let row = await fastify.prisma.marketItemCurrentPrice.findUnique({ where: { itemId } })
      if (!row) {
        return reply.code(404).send({ error: 'item_not_found' })
      }

      const isStale = Date.now() - row.updatedAt.getTime() > STALE_THRESHOLD_MS
      const alreadyRefreshing = implicitRefreshInFlight.has(itemId)
      if (isStale && !alreadyRefreshing) {
        const apiKey = await resolveApiKeyForImplicitRefresh(request.userId!)
        if (apiKey) {
          implicitRefreshInFlight.add(itemId)
          try {
            const refreshed = await refreshCurrentMinPrice(itemId, apiKey)
            if (refreshed) row = refreshed
          } catch (err) {
            // 암묵적 갱신 실패는 조회 자체를 막지 않는다 — 캐시된 값을 그대로 반환한다.
            request.log.warn({ err, itemId }, 'market price implicit refresh failed')
          } finally {
            implicitRefreshInFlight.delete(itemId)
          }
        }
      }

      return reply.send(toCurrentPriceResponse(row))
    },
  )

  fastify.get<{ Params: { itemId: string }; Querystring: { from?: string; to?: string; period?: string } }>(
    '/api/market/items/:itemId/history',
    {
      preHandler: premiumGate,
      schema: { tags: ['Market'], summary: '거래소 기간별(일간/주간/월간) 시세 히스토리 조회 (프리미엄 전용)' },
    },
    async (request, reply) => {
      const itemId = Number.parseInt(request.params.itemId, 10)
      if (!Number.isInteger(itemId)) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const parsed = historyQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const { period, from, to } = parsed.data
      const dateRange = { gte: new Date(from), lte: new Date(to) }

      // 세 테이블 모두 (itemId, 기간 시작일)당 한 행이라 응답 형태를 date/itemName/avgPrice/
      // tradeCount로 통일한다 — 주간/월간은 date가 그 기간의 시작일(각각 수요일/1일)이다
      // (docs/market_price.md "파이프라인 C" 참고).
      let points: { date: Date; itemName: string; avgPrice: number; tradeCount: number }[]
      if (period === 'weekly') {
        const rows = await fastify.prisma.marketItemWeeklyStat.findMany({
          where: { itemId, weekStartDate: dateRange },
          orderBy: { weekStartDate: 'asc' },
        })
        points = rows.map((row) => ({
          date: row.weekStartDate,
          itemName: row.itemName,
          avgPrice: row.avgPrice,
          tradeCount: row.tradeCount,
        }))
      } else if (period === 'monthly') {
        const rows = await fastify.prisma.marketItemMonthlyStat.findMany({
          where: { itemId, monthStartDate: dateRange },
          orderBy: { monthStartDate: 'asc' },
        })
        points = rows.map((row) => ({
          date: row.monthStartDate,
          itemName: row.itemName,
          avgPrice: row.avgPrice,
          tradeCount: row.tradeCount,
        }))
      } else {
        const rows = await fastify.prisma.marketItemDailyStat.findMany({
          where: { itemId, date: dateRange },
          orderBy: { date: 'asc' },
        })
        points = rows.map((row) => ({
          date: row.date,
          itemName: row.itemName,
          avgPrice: row.avgPrice,
          tradeCount: row.tradeCount,
        }))
      }

      const icon = (await iconsByItemId([itemId])).get(itemId) ?? null
      return reply.send(
        points.map((point) => ({
          date: point.date.toISOString().slice(0, 10),
          itemName: point.itemName,
          avgPrice: point.avgPrice,
          tradeCount: point.tradeCount,
          icon,
        })),
      )
    },
  )

  fastify.post<{ Params: { itemId: string } }>(
    '/api/market/items/:itemId/refresh',
    { preHandler: auth, schema: { tags: ['Market'], summary: '거래소 시세 명시적 새로고침' } },
    async (request, reply) => {
      const itemId = Number.parseInt(request.params.itemId, 10)
      if (!Number.isInteger(itemId)) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const apiKey = await resolveApiKeyOrRespondError(request, reply)
      if (!apiKey) return

      try {
        const refreshed = await refreshCurrentMinPrice(itemId, apiKey)
        if (!refreshed) {
          return reply.code(404).send({ error: 'item_not_found' })
        }
        return reply.send(toCurrentPriceResponse(refreshed))
      } catch (err) {
        if (err instanceof LostarkApiError) {
          if (err.kind === 'rate_limited') {
            return reply.code(429).send({ error: 'lostark_api_rate_limited' })
          }
          if (err.kind === 'unauthorized') {
            return reply.code(400).send({ error: 'lostark_key_invalid' })
          }
        }
        request.log.error({ err, itemId }, 'lostark api request failed')
        return reply.code(502).send({ error: 'lostark_api_unavailable' })
      }
    },
  )

  fastify.post<{ Body: { itemIds: number[] } }>(
    '/api/market/items/refresh-batch',
    { preHandler: auth, schema: { tags: ['Market'], summary: '거래소 시세 명시적 새로고침 (묶음, 최대 50개)' } },
    async (request, reply) => {
      const parsed = refreshBatchSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const apiKey = await resolveApiKeyOrRespondError(request, reply)
      if (!apiKey) return

      // 캐시 행이 없는 itemId는 category_code를 몰라 검색 자체가 불가능하다 — 결과에서 제외한다
      // (docs/market_price.typ "묶음(세트) 갱신 최적화" 참고).
      const uniqueItemIds = Array.from(new Set(parsed.data.itemIds))
      const cachedRows = await fastify.prisma.marketItemCurrentPrice.findMany({
        where: { itemId: { in: uniqueItemIds } },
      })
      const categoryCodeByItemId = new Map(cachedRows.map((row) => [row.itemId, row.categoryCode]))

      const itemIdsByCategory = new Map<number, Set<number>>()
      for (const itemId of uniqueItemIds) {
        const categoryCode = categoryCodeByItemId.get(itemId)
        if (categoryCode === undefined) continue
        if (!itemIdsByCategory.has(categoryCode)) itemIdsByCategory.set(categoryCode, new Set())
        itemIdsByCategory.get(categoryCode)!.add(itemId)
      }

      const refreshedItemIds = new Set<number>()

      try {
        for (const [categoryCode, wantedItemIds] of itemIdsByCategory) {
          for (let pageNo = 0; pageNo < CATEGORY_PAGE_WALK_CAP; pageNo++) {
            const page = await searchMarketItems(apiKey, { categoryCode, pageNo })

            // 요청받지 않은 아이템도 같은 페이지에 왔으니 opportunistic하게 함께 갱신한다 — 카테고리
            // 검색 한 번을 이미 API 호출 예산으로 지불했으므로 공짜다(docs/market_price.typ 참고).
            for (const item of page.items) {
              if (item.currentMinPrice === null) continue
              await fastify.prisma.marketItemCurrentPrice.upsert({
                where: { itemId: item.itemId },
                create: {
                  itemId: item.itemId,
                  itemName: item.itemName,
                  categoryCode,
                  grade: item.grade,
                  icon: item.icon,
                  currentMinPrice: item.currentMinPrice,
                },
                update: {
                  itemName: item.itemName,
                  categoryCode,
                  grade: item.grade,
                  icon: item.icon,
                  currentMinPrice: item.currentMinPrice,
                },
              })
              if (wantedItemIds.has(item.itemId)) refreshedItemIds.add(item.itemId)
            }

            const allWantedFound = [...wantedItemIds].every((itemId) => refreshedItemIds.has(itemId))
            const totalPages = Math.ceil(page.totalCount / (page.pageSize || 10))
            if (allWantedFound || pageNo + 1 >= totalPages || page.items.length === 0) break
          }
        }
      } catch (err) {
        if (err instanceof LostarkApiError) {
          if (err.kind === 'rate_limited') {
            return reply.code(429).send({ error: 'lostark_api_rate_limited' })
          }
          if (err.kind === 'unauthorized') {
            return reply.code(400).send({ error: 'lostark_key_invalid' })
          }
        }
        request.log.error({ err }, 'lostark api request failed')
        return reply.code(502).send({ error: 'lostark_api_unavailable' })
      }

      if (refreshedItemIds.size === 0) {
        return reply.send([])
      }

      const refreshedRows = await fastify.prisma.marketItemCurrentPrice.findMany({
        where: { itemId: { in: [...refreshedItemIds] } },
      })
      const requestOrder = new Map(parsed.data.itemIds.map((itemId, index) => [itemId, index]))
      refreshedRows.sort((a, b) => (requestOrder.get(a.itemId) ?? 0) - (requestOrder.get(b.itemId) ?? 0))

      return reply.send(refreshedRows.map(toCurrentPriceResponse))
    },
  )
}
