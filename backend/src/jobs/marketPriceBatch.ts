import type { PrismaClient } from '@prisma/client'
import type { FastifyBaseLogger } from 'fastify'

import {
  fetchMarketCategories,
  fetchMarketItemStats,
  flattenLeafCategoryCodes,
  searchMarketItems,
} from '../lib/marketApi.js'
import {
  lastCompletedMonthRange,
  lastCompletedWeekRange,
  shouldRollupMonthly,
  shouldRollupWeekly,
  weightedAverage,
  type DailyStatLike,
} from '../lib/marketRollup.js'

// 분당 100회 한도(요청당 최소 0.6초)보다 훨씬 여유 있는 간격. docs/market_price.typ "파이프라인 A" 참고.
const REQUEST_INTERVAL_MS = 1500

const MS_PER_DAY = 24 * 60 * 60 * 1000
// docs/market_price.typ "파이프라인 C" 보존 기간(사용자 확정): 일별 180일, 주간 52주(≈1년),
// 월간 60개월(5년).
const DAILY_RETENTION_DAYS = 180
const WEEKLY_RETENTION_WEEKS = 52
const MONTHLY_RETENTION_MONTHS = 60

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** KST 기준 오늘 날짜("YYYY-MM-DD"). Open API Stats 응답의 첫 원소(오늘, 미확정 값)를 걸러내는 데 쓴다. */
function todayKstDateString(): string {
  const kstMs = Date.now() + 9 * 60 * 60 * 1000
  return new Date(kstMs).toISOString().slice(0, 10)
}

/** 주간/월간 롤업 둘 다에서 쓰는 공통 그룹핑 — 어떤 기간의 Market_Item_Daily_Stats 행들을
 * itemId별로 묶어, weightedAverage에 바로 넘길 수 있는 형태로 만든다. */
function groupDailyRowsByItem(
  rows: { itemId: number; itemName: string; avgPrice: number; tradeCount: number }[],
): Map<number, { itemName: string; rows: DailyStatLike[] }> {
  const grouped = new Map<number, { itemName: string; rows: DailyStatLike[] }>()
  for (const row of rows) {
    const entry = grouped.get(row.itemId) ?? { itemName: row.itemName, rows: [] }
    entry.rows.push({ avgPrice: row.avgPrice, tradeCount: row.tradeCount })
    grouped.set(row.itemId, entry)
  }
  return grouped
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

    // 파이프라인 C: 주간/월간 집계 + 보존 기간 삭제 (docs/market_price.typ "파이프라인 C" 참고).
    // 별도 Open API 호출 없이 이미 저장된 Market_Item_Daily_Stats만 읽어서 계산한다 — 이번
    // 실행에서 모은 itemIds(메모리 Set)를 재사용하지 않고 그 기간의 데이터를 DB에서 직접
    // 다시 조회한다(재실행/단독 실행에도 안전, 문서의 "이미 저장된 것만 읽어서 계산" 원칙과 일치).
    const now = new Date()

    if (shouldRollupWeekly(now)) {
      try {
        const { start, end } = lastCompletedWeekRange(now)
        const rows = await prisma.marketItemDailyStat.findMany({
          where: { date: { gte: start, lte: end } },
          select: { itemId: true, itemName: true, avgPrice: true, tradeCount: true },
        })
        const grouped = groupDailyRowsByItem(rows)
        for (const [itemId, { itemName, rows: itemRows }] of grouped) {
          const { avgPrice, tradeCount } = weightedAverage(itemRows)
          await prisma.marketItemWeeklyStat.upsert({
            where: { itemId_weekStartDate: { itemId, weekStartDate: start } },
            create: { itemId, weekStartDate: start, itemName, avgPrice, tradeCount },
            update: { itemName, avgPrice, tradeCount },
          })
        }
        logger.info(
          { weekStartDate: start, itemCount: grouped.size },
          'market price batch: weekly rollup done',
        )
      } catch (err) {
        logger.error({ err }, 'market price batch: weekly rollup failed')
      }
    }

    if (shouldRollupMonthly(now)) {
      try {
        const { start, end } = lastCompletedMonthRange(now)
        const rows = await prisma.marketItemDailyStat.findMany({
          where: { date: { gte: start, lte: end } },
          select: { itemId: true, itemName: true, avgPrice: true, tradeCount: true },
        })
        const grouped = groupDailyRowsByItem(rows)
        for (const [itemId, { itemName, rows: itemRows }] of grouped) {
          const { avgPrice, tradeCount } = weightedAverage(itemRows)
          await prisma.marketItemMonthlyStat.upsert({
            where: { itemId_monthStartDate: { itemId, monthStartDate: start } },
            create: { itemId, monthStartDate: start, itemName, avgPrice, tradeCount },
            update: { itemName, avgPrice, tradeCount },
          })
        }
        logger.info(
          { monthStartDate: start, itemCount: grouped.size },
          'market price batch: monthly rollup done',
        )
      } catch (err) {
        logger.error({ err }, 'market price batch: monthly rollup failed')
      }
    }

    try {
      const dailyCutoff = new Date(now.getTime() - DAILY_RETENTION_DAYS * MS_PER_DAY)
      const weeklyCutoff = new Date(now.getTime() - WEEKLY_RETENTION_WEEKS * 7 * MS_PER_DAY)
      const monthlyCutoff = new Date(now)
      monthlyCutoff.setUTCMonth(monthlyCutoff.getUTCMonth() - MONTHLY_RETENTION_MONTHS)

      const [dailyDeleted, weeklyDeleted, monthlyDeleted] = await Promise.all([
        prisma.marketItemDailyStat.deleteMany({ where: { date: { lt: dailyCutoff } } }),
        prisma.marketItemWeeklyStat.deleteMany({ where: { weekStartDate: { lt: weeklyCutoff } } }),
        prisma.marketItemMonthlyStat.deleteMany({ where: { monthStartDate: { lt: monthlyCutoff } } }),
      ])
      logger.info(
        {
          dailyDeleted: dailyDeleted.count,
          weeklyDeleted: weeklyDeleted.count,
          monthlyDeleted: monthlyDeleted.count,
        },
        'market price batch: retention cleanup done',
      )
    } catch (err) {
      logger.error({ err }, 'market price batch: retention cleanup failed')
    }
  } catch (err) {
    logger.error({ err }, 'market price batch: aborted with unexpected error')
  } finally {
    isRunning = false
  }
}
