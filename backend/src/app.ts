import Fastify from 'fastify'
import cookie from '@fastify/cookie'

import { env } from './lib/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { healthRoutes } from './routes/health.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cookie, { secret: env.SESSION_SECRET })
  await app.register(prismaPlugin)

  await app.register(healthRoutes)

  // 나머지 라우트(인증, 캐릭터 배너, 가디언/쿠르잔/낙원, 로그, 통계)는
  // docs/api.typ 엔드포인트 목록을 기준으로 src/routes/ 아래에 하나씩 추가한다.

  return app
}
