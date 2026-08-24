import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'

import {
  fetchMarketCategories,
  fetchMarketItemStats,
  flattenLeafCategoryCodes,
  searchMarketItems,
} from '../lib/marketApi.js'

// 분당 100회 한도(요청당 최소 0.6초)보다 훨씬 여유 있는 간격. docs/market_price.typ "파이프라인 A" 참고.
const REQUEST_INTERVAL_MS = 1500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** KST 기준 오늘 날짜("YYYY-MM-DD"). Open API Stats 응답의 첫 원소(오늘, 미확정 값)를 걸러내는 데 쓴다. */
function todayKstDateString(): string {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000
  return new Date(kstMs).toISOString().slice(0, 10)
}

// 같은 프로세스 안에서 배치가 겹쳐 실행되는 것을 막는다(예: 이전 실행이 4시간을 넘겨 다음 트리거와 겹치는 경우).
let isRunning = false

/**
 * 파이프라인 A(야간 배치): 거래소 아이템 전체를 순회하며 현재 최소 판매가(Market_Item_Current_Prices)와
 * 일별 시세 통계(Market_Item_Daily_Stats)를 채운다. docs/market_price.typ 참고.
 */
export async function runMarketPriceBatch(
  prisma: PrismaClient,
  apiKey: string,
  logger: FastifyBaseLogger,
): Promise<void> {
  if (isRunning) {
    logger.warn('market price batch: previous run still in progress, skipping this trigger')
    return
  }

  isRunning = true
  const startedAt = Date.now()
  logger.info('market price batch: started')

  try {
    const categories = await fetchMarketCategories(apiKey)
    await delay(REQUEST_INTERVAL_MS)
    const leafCategoryCodes = flattenLeafCategoryCodes(categories)

    const itemIds = new Set<number>()
    let currentPriceUpserts = 0
    let failedPages = 0

    for (const categoryCode of leafCategoryCodes) {
      let pageNo = 0
      for (;;) {
        let page
        try {
          page = await searchMarketItems(apiKey, { categoryCode, pageNo })
        } catch (err) {
          failedPages += 1
          logger.error({ err, categoryCode, pageNo }, 'market price batch: search page failed, skipping')
          break
        }
        await delay(REQUEST_INTERVAL_MS)

        for (const item of page.items) {
          itemIds.add(item.itemId)
          // 현재 최소 판매가·등급·아이콘은 이 검색 응답에 이미 포함돼 있어 별도 호출 없이 바로
          // 갱신한다(docs/market_price.typ "사용 Open API 엔드포인트" 참고). category_code도 함께
          // 저장해 두어야 파이프라인 B가 나중에 이 아이템 하나만 콕 집어 재검색할 수 있다.
          if (item.currentMinPrice !== null) {
            await prisma.marketItemCurrentPrice.upsert({
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
            currentPriceUpserts += 1
          }
        }

        const totalPages = Math.ceil(page.totalCount / (page.pageSize || 10))
        pageNo += 1
        if (pageNo >= totalPages || page.items.length === 0) {
          break
        }
      }
    }

    logger.info(
      { itemCount: itemIds.size, currentPriceUpserts, failedPages },
      'market price batch: catalog enumeration done, starting daily stats collection',
    )

    const today = todayKstDateString()
    let dailyStatRowsInserted = 0
    let failedItems = 0

    for (const itemId of itemIds) {
      try {
        const result = await fetchMarketItemStats(apiKey, itemId)
        if (result) {
          const entriesToInsert = result.stats
            .filter((stat) => stat.date !== today)
            .map((stat) => ({
              itemId,
              date: new Date(stat.date),
              itemName: result.itemName,
              avgPrice: stat.avgPrice,
              tradeCount: stat.tradeCount,
            }))

          // 이미 저장된 (item_id, date)는 건드리지 않는 멱등 upsert — DB 유니크 제약으로 중복은
          // 조용히 건너뛴다(docs/db_schema.typ "Market_Item_Daily_Stats" 참고).
          if (entriesToInsert.length > 0) {
            const { count } = await prisma.marketItemDailyStat.createMany({
              data: entriesToInsert,
              skipDuplicates: true,
            })
            dailyStatRowsInserted += count
          }
        }
      } catch (err) {
        failedItems += 1
        logger.error({ err, itemId }, 'market price batch: item stats fetch failed, skipping')
      }
      await delay(REQUEST_INTERVAL_MS)
    }

    logger.info(
      { dailyStatRowsInserted, failedItems, elapsedMs: Date.now() - startedAt },
      'market price batch: finished',
    )
  } catch (err) {
    logger.error({ err }, 'market price batch: aborted with unexpected error')
  } finally {
    isRunning = false
  }
}
