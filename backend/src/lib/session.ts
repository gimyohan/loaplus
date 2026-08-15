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
