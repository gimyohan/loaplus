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
  // '::'로 바인딩하면 대부분의 OS(Windows/Linux 기본 dual-stack)에서 IPv6와 IPv4를 동시에
  // 수신한다. '0.0.0.0'만 사용하면 브라우저가 localhost를 ::1로 먼저 시도했다가 연결이
  // 거부된 뒤 127.0.0.1로 재시도하는 Happy Eyeballs 폴백 지연(~300ms)이 매 요청마다 발생한다.
  await app.listen({ port: env.PORT, host: '::' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
