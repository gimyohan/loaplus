import { Prisma } from '@prisma/client'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { env } from './lib/env.js'
import { prismaPlugin } from './plugins/prisma.js'
import { abilityStoneRoutes } from './routes/abilityStone.js'
import { authRoutes } from './routes/auth.js'
import { characterRoutes } from './routes/characters.js'
import { customWidgetRoutes } from './routes/customWidgets.js'
import { dashboardRoutes } from './routes/dashboards.js'
import { ebonyCubeHalHourglassRoutes } from './routes/ebonyCubeHalHourglass.js'
import { healthRoutes } from './routes/health.js'
import { homeworkRoutes } from './routes/homeworks.js'
import { logRoutes } from './routes/logs.js'
import { marketRoutes } from './routes/market.js'
import { raidRoutes } from './routes/raids.js'
import { statisticsRoutes } from './routes/statistics.js'
import { templateRoutes } from './routes/templates.js'
import { userRoutes } from './routes/user.js'

export async function buildApp() {
  // nginx(같은 호스트, 127.0.0.1)가 리버스 프록시로 앞단에 있는 배포 환경에서, 이게 없으면
  // request.ip가 항상 nginx의 IP로 잡혀서 IP 기준 rate limiting이 전체 유저를 하나로 묶어버린다
  // (docs/rate_limiting.typ 참고). X-Forwarded-For를 신뢰해 실제 클라이언트 IP를 쓰도록 한다.
  const app = Fastify({ logger: true, trustProxy: true })

  // 세션 쿠키를 실어 호출할 수 있게 허용하는 origin 목록을 CORS_ORIGINS 환경변수로 받는다
  // (기본값은 로컬 dev 서버 하나 — env.ts 참고). 배포 환경에서는 실제 도메인으로 덮어쓰며,
  // 여러 origin(예: 로컬 + 배포 도메인)을 동시에 허용하고 싶으면 콤마로 나열하면 된다.
  // @fastify/cors 기본 methods는 GET,HEAD,POST뿐이라 PATCH/PUT/DELETE를 쓰는 라우트가
  // 전부 preflight에서 막히므로 명시적으로 열어준다.
  await app.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
  await app.register(cookie, { secret: env.SESSION_SECRET })
  // IP당 분당 300회 기본값. 로그인 전 요청(세션 조회 등)도 걸려야 해서 세션/유저 기준이 아닌
  // IP 기준으로 건다. 개별 라우트는 route 옵션의 config.rateLimit으로 이 값을 override할 수
  // 있다(docs/rate_limiting.typ 참고 — 예: 로그인 라우트는 훨씬 좁은 값을 쓴다).
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  })
  await app.register(prismaPlugin)

  // 상세 정책/설계 문서는 docs/api.typ가 정본(source of truth)이며, 이 Swagger UI는 그 문서를
  // 대체하지 않는 보조 도구다 — 엔드포인트 목록을 훑어보고 브라우저에서 바로 호출(Try it out)해
  // 볼 수 있게 하는 용도로, 요청/응답 스키마 상세 검증까지는 반영하지 않는다(각 라우트가 여전히
  // 핸들러 내부에서 zod로 직접 검증한다).
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'LoaPlus API',
        description: '로스트아크 숙제 관리 서비스 백엔드 API. 상세 정책/설계는 docs/api.typ 참고.',
        version: '0.0.0',
      },
      servers: [{ url: 'http://localhost:4000' }],
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

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
  await app.register(ebonyCubeHalHourglassRoutes)
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
