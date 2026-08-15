import { schedule } from 'node-cron'

import { buildApp } from './app.js'
import { runMarketPriceBatch } from './jobs/marketPriceBatch.js'
import { env } from './lib/env.js'

const app = await buildApp()

// 파이프라인 A(야간 배치): 매일 01:00 KST. docs/market_price.typ 참고.
// LOSTARK_BATCH_API_KEY가 없는 환경(예: 로컬 개발)에서는 스케줄 자체를 등록하지 않는다.
if (env.LOSTARK_BATCH_API_KEY) {
  const batchApiKey = env.LOSTARK_BATCH_API_KEY
  schedule(
    '0 1 * * *',
    () => {
      void runMarketPriceBatch(app.prisma, batchApiKey, app.log)
    },
    { timezone: 'Asia/Seoul', noOverlap: true },
  )
  app.log.info('market price batch scheduled: daily 01:00 Asia/Seoul')
} else {
  app.log.warn('LOSTARK_BATCH_API_KEY not set — market price nightly batch disabled')
}

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
