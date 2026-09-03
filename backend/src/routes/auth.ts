import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { z } from 'zod'

import { generateDepositCode } from '../lib/depositCode.js'
import { verifyGoogleIdToken } from '../lib/googleAuth.js'
import { getSessionUserId, SESSION_COOKIE_NAME, sessionCookieOptions } from '../lib/session.js'

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
})

// deposit_code는 UNIQUE라 신규 유저 생성 시 극히 드물게 충돌할 수 있다 — upsert 자체(googleSub
// 기준)의 원자성은 유지하면서, 그 경우에만 새 코드로 재시도한다 (docs/subscription.typ
// "무통장입금 식별자" 참고).
const MAX_DEPOSIT_CODE_ATTEMPTS = 5

async function findOrCreateUser(prisma: PrismaClient, googleSub: string) {
  for (let attempt = 0; attempt < MAX_DEPOSIT_CODE_ATTEMPTS; attempt++) {
    try {
      return await prisma.user.upsert({
        where: { googleSub },
        update: {},
        create: { googleSub, depositCode: generateDepositCode() },
      })
    } catch (err) {
      const isDepositCodeCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        (err.meta?.target as string[] | undefined)?.includes('deposit_code')
      if (isDepositCodeCollision && attempt < MAX_DEPOSIT_CODE_ATTEMPTS - 1) continue
      throw err
    }
  }
  throw new Error('unreachable: exceeded deposit code generation attempts')
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/auth/google',
    {
      schema: { tags: ['Auth'], summary: 'Google ID 토큰 검증 및 로그인/회원가입' },
      // 전역 기본값(분당 300회)보다 훨씬 좁게 건다 — 무차별 로그인 시도·대량 계정 생성 방지
      // (docs/rate_limiting.typ "로그인 라우트: 엄격 제한" 참고).
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
    const parsed = googleLoginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    let googleSub: string
    try {
      googleSub = await verifyGoogleIdToken(parsed.data.idToken)
    } catch (err) {
      request.log.warn({ err }, 'google id token verification failed')
      return reply.code(401).send({ error: 'invalid_google_token' })
    }

    const user = await findOrCreateUser(fastify.prisma, googleSub)

    reply.setCookie(SESSION_COOKIE_NAME, user.id, sessionCookieOptions(parsed.data.rememberMe))

    return reply.send({ userId: user.id, nickname: user.nickname })
  })

  fastify.get(
    '/api/auth/session',
    { schema: { tags: ['Auth'], summary: '로그인 여부 및 최소 사용자 식별 정보 조회' } },
    async (request, reply) => {
    const userId = getSessionUserId(request)
    if (!userId) {
      return reply.send({ authenticated: false })
    }

    const user = await fastify.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
      return reply.send({ authenticated: false })
    }

    return reply.send({ authenticated: true, userId: user.id, nickname: user.nickname })
  })

  fastify.post(
    '/api/auth/logout',
    { schema: { tags: ['Auth'], summary: '로그아웃 (세션 무효화)' } },
    async (request, reply) => {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return reply.code(204).send()
  })
}
