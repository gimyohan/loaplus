import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { encryptLostarkApiKey } from '../lib/lostarkKeyCrypto.js'
import { requireAuth, SESSION_COOKIE_NAME } from '../lib/session.js'

const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(50),
})

const updateLostarkKeySchema = z.object({
  apiKey: z.string().trim().min(1),
})

/**
 * "지금 프리미엄인가"는 별도 컬럼 없이 premium_expires_at과 현재 시각을 비교해 매번 계산한다
 * — 세션 등에 캐싱하지 않는다(만료 시각이 지나도 다음 로그인 전까지 프리미엄으로 남는 문제를
 * 막기 위함). docs/subscription.typ 참고.
 */
function isPremium(premiumExpiresAt: Date | null): boolean {
  return premiumExpiresAt !== null && premiumExpiresAt.getTime() > Date.now()
}

function toProfileResponse(user: {
  id: string
  nickname: string | null
  lostarkApiKey: string | null
  lastVisitedAt: Date | null
  premiumExpiresAt: Date | null
  depositCode: string
  createdAt: Date
}) {
  return {
    userId: user.id,
    nickname: user.nickname,
    hasLostarkApiKey: user.lostarkApiKey !== null,
    // isPremium은 이 응답을 만든 시점의 판정 스냅샷. premiumExpiresAt(절대 시각)은 카운트다운
    // 계산용으로 그대로 내려주며, "남은 초" 자체는 서버가 계산하지 않는다(docs/subscription.typ
    // "몇 초 남았는지는 서버가 아니라 클라이언트가 계산" 참고).
    isPremium: isPremium(user.premiumExpiresAt),
    premiumExpiresAt: user.premiumExpiresAt,
    // 비밀정보가 아니다 — 은행 거래 내역(입금자명)에 그대로 노출되는 값이라 재노출을 막지
    // 않는다 (docs/subscription.typ "무통장입금 식별자" 참고).
    depositCode: user.depositCode,
    lastVisitedAt: user.lastVisitedAt,
    createdAt: user.createdAt,
  }
}

export async function userRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  fastify.get('/api/user/profile', { preHandler: auth }, async (request, reply) => {
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: request.userId! } })
    return reply.send(toProfileResponse(user))
  })

  fastify.patch('/api/user/profile', { preHandler: auth }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const user = await fastify.prisma.user.update({
      where: { id: request.userId! },
      data: { nickname: parsed.data.nickname },
    })

    return reply.send(toProfileResponse(user))
  })

  fastify.delete('/api/user', { preHandler: auth }, async (request, reply) => {
    await fastify.prisma.user.delete({ where: { id: request.userId! } })
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return reply.code(204).send()
  })

  fastify.patch('/api/user/lostark-key', { preHandler: auth }, async (request, reply) => {
    const parsed = updateLostarkKeySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const user = await fastify.prisma.user.update({
      where: { id: request.userId! },
      data: { lostarkApiKey: encryptLostarkApiKey(parsed.data.apiKey) },
    })

    return reply.send(toProfileResponse(user))
  })

  // 이미 키가 없어도(중복 호출 등) 그대로 204 — 최종 상태(키 없음)가 같으므로 멱등하게
  // 처리하고 404로 구분하지 않는다 (docs/api.typ "외부 API 연동 세부사항" 참고).
  fastify.delete('/api/user/lostark-key', { preHandler: auth }, async (request, reply) => {
    await fastify.prisma.user.update({
      where: { id: request.userId! },
      data: { lostarkApiKey: null },
    })

    return reply.code(204).send()
  })
}
