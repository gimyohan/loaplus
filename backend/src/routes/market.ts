import type { MarketItemCurrentPrice } from '@prisma/client'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

import { LostarkApiError } from '../lib/lostarkApi.js'
import { checkSharedKeyThrottle, resolveLostarkApiKey } from '../lib/lostarkKeyResolution.js'
import { findMarketItemByNameInCategory, searchMarketItems } from '../lib/marketApi.js'
import { requireAuth } from '../lib/session.js'

// docs/market_price.typ 파이프라인 B: 30분을 넘기면 조회 시점에 암묵적 갱신을 트리거한다.
const STALE_THRESHOLD_MS = 30 * 60 * 1000

// docs/market_price.typ "묶음(세트) 갱신 최적화" 참고.
const MAX_BATCH_ITEM_IDS = 50
const CATEGORY_PAGE_WALK_CAP = 20

const historyQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

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

export async function marketRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

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

  fastify.get<{ Params: { itemId: string }; Querystring: { from?: string; to?: string } }>(
    '/api/market/items/:itemId/history',
    { preHandler: auth, schema: { tags: ['Market'], summary: '거래소 일자별 시세 히스토리 조회' } },
    async (request, reply) => {
      const itemId = Number.parseInt(request.params.itemId, 10)
      if (!Number.isInteger(itemId)) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const parsed = historyQuerySchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const rows = await fastify.prisma.marketItemDailyStat.findMany({
        where: {
          itemId,
          date: { gte: new Date(parsed.data.from), lte: new Date(parsed.data.to) },
        },
        orderBy: { date: 'asc' },
      })

      return reply.send(
        rows.map((row) => ({
          date: row.date.toISOString().slice(0, 10),
          avgPrice: row.avgPrice,
          tradeCount: row.tradeCount,
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
