import type { CookieSerializeOptions } from '@fastify/cookie'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}

export const SESSION_COOKIE_NAME = 'session'

export function sessionCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    signed: true,
    path: '/',
  }
}

/** 서명된 세션 쿠키에서 user id를 꺼낸다. 쿠키가 없거나 서명이 유효하지 않으면 null. */
export function getSessionUserId(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE_NAME]
  if (!raw) return null

  const unsigned = request.unsignCookie(raw)
  if (!unsigned.valid || !unsigned.value) return null

  return unsigned.value
}

/**
 * 인증이 필요한 라우트에 붙이는 preHandler. 세션 쿠키를 검증하고 유저가 실제로
 * 존재하는지까지 확인한 뒤 request.userId를 채운다. 실패하면 401을 응답한다.
 */
export function requireAuth(fastify: FastifyInstance) {
  return async function requireAuthHandler(request: FastifyRequest, reply: FastifyReply) {
    const userId = getSessionUserId(request)
    if (!userId) {
      return reply.code(401).send({ error: 'unauthorized' })
    }

    const user = await fastify.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
      return reply.code(401).send({ error: 'unauthorized' })
    }

    request.userId = user.id
  }
}

/**
 * "지금 프리미엄인가"는 별도 컬럼 없이 premium_expires_at과 현재 시각을 비교해 매번 계산한다
 * — 세션 등에 캐싱하지 않는다(만료 시각이 지나도 다음 로그인 전까지 프리미엄으로 남는 문제를
 * 막기 위함). docs/subscription.typ 참고. routes/user.ts의 프로필 응답도 이 함수를 그대로 쓴다.
 */
export function isPremium(premiumExpiresAt: Date | null): boolean {
  return premiumExpiresAt !== null && premiumExpiresAt.getTime() > Date.now()
}

/**
 * 프리미엄 전용 라우트에 requireAuth 뒤에 이어 붙이는 preHandler(예: preHandler: [auth, premium]).
 * request.userId가 이미 채워져 있어야 한다. 프리미엄이 아니면 403을 응답한다 — 거래소 시세(Market)
 * 탭이 첫 사용처다(docs/subscription.typ "기능 제한 대상", docs/api.typ "거래소 시세" 참고).
 */
export function requirePremium(fastify: FastifyInstance) {
  return async function requirePremiumHandler(request: FastifyRequest, reply: FastifyReply) {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId! },
      select: { premiumExpiresAt: true },
    })
    if (!user || !isPremium(user.premiumExpiresAt)) {
      return reply.code(403).send({ error: 'premium_required' })
    }
  }
}
