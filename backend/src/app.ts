import { Prisma } from '@prisma/client'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'

import { env } from './lib/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { abilityStoneRoutes } from './routes/abilityStone.js'
import { authRoutes } from './routes/auth.js'
import { characterRoutes } from './routes/characters.js'
import { customWidgetRoutes } from './routes/customWidgets.js'
import { dashboardRoutes } from './routes/dashboards.js'
import { healthRoutes } from './routes/health.js'
import { homeworkRoutes } from './routes/homeworks.js'
import { logRoutes } from './routes/logs.js'
import { marketRoutes } from './routes/market.js'
import { raidRoutes } from './routes/raids.js'
import { statisticsRoutes } from './routes/statistics.js'
import { templateRoutes } from './routes/templates.js'
import { userRoutes } from './routes/user.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  // 프론트 dev 서버(Vite, http://localhost:5173)에서 세션 쿠키를 실어 호출할 수 있도록 허용.
  // @fastify/cors 기본 methods는 GET,HEAD,POST뿐이라 PATCH/PUT/DELETE를 쓰는 라우트가
  // 전부 preflight에서 막히므로 명시적으로 열어준다.
  await app.register(cors, {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
  await app.register(cookie, { secret: env.SESSION_SECRET })
  await app.register(prismaPlugin)

  // 프론트가 바디 없는 POST/DELETE(로그아웃, 회원 탈퇴 등)에도 Content-Type: application/json을
  // 붙여 보내는 경우가 있어, 기본 파서가 던지는 FST_ERR_CTP_EMPTY_JSON_BODY를 완화한다.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (request, body, done) => {
      if (body === '') {
        done(null, undefined)
        return
      }
      try {
        done(null, JSON.parse(body as string))
      } catch (err) {
        const parseError = err as Error & { statusCode?: number }
        parseError.statusCode = 400
        done(parseError, undefined)
      }
    },
  )

  // PK/FK 컬럼이 Postgres 네이티브 uuid 타입이라(docs/db_schema.typ 상단 참고), URL 경로
  // 파라미터로 형식이 잘못된 id가 들어오면 Prisma가 P2023(Inconsistent column data)을 던진다.
  // 그런 값은 애초에 어떤 실제 행과도 매칭될 수 없으므로, uuid 타입 도입 전(TEXT 컬럼이라
  // 그냥 매칭 실패로 끝났을 때)과 동일하게 404로 통일해 500으로 새지 않게 한다.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2023') {
      return reply.code(404).send({ error: 'not_found' })
    }
    return reply.send(error)
  })

  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(userRoutes)
  await app.register(characterRoutes)
  await app.register(homeworkRoutes)
  await app.register(logRoutes)
  await app.register(raidRoutes)
  await app.register(marketRoutes)
  await app.register(dashboardRoutes)
  await app.register(customWidgetRoutes)
  await app.register(statisticsRoutes)
  await app.register(templateRoutes)
  await app.register(abilityStoneRoutes)

  return app
}
