import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { revertActionLog, toLogEntry } from '../lib/actionLogs.js'
import { requireAuth } from '../lib/session.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

const logsQuerySchema = z.object({
  characterId: z.string().uuid().optional(),
  raidId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
})

export async function logRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  fastify.get('/api/logs', { preHandler: auth }, async (request, reply) => {
    const parsed = logsQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    const { characterId, raidId, from, to, cursor, limit } = parsed.data

    if (characterId) {
      const character = await fastify.prisma.character.findFirst({
        where: { id: characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }
    }

    const logs = await fastify.prisma.actionLog.findMany({
      where: {
        userId: request.userId!,
        ...(characterId ? { characterId } : {}),
        // raidId는 관문 미완료 처리용 조회라 RAID_GATE_CLEAR로만 좁힌다 (docs/api.typ "관문
        // 미완료 처리" 참고). gateIndex는 revert_params(JSONB) 안에만 있어 DB에서 정렬할 수
        // 없으므로, 아래에서 조회 후 gateIndex 내림차순으로 다시 정렬한다.
        ...(raidId
          ? { actionType: 'RAID_GATE_CLEAR' as const, revertParams: { path: ['raidId'], equals: raidId } }
          : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { character: { select: { characterName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit ?? DEFAULT_LIMIT,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const entries = logs.map(toLogEntry)
    if (raidId) {
      entries.sort((a, b) => (b.gateIndex ?? -1) - (a.gateIndex ?? -1))
    }

    return reply.send(entries)
  })

  fastify.delete<{ Params: { logId: string } }>(
    '/api/logs/:logId',
    { preHandler: auth },
    async (request, reply) => {
      const log = await fastify.prisma.actionLog.findFirst({
        where: { id: request.params.logId, userId: request.userId! },
      })
      if (!log) {
        return reply.code(404).send({ error: 'log_not_found' })
      }

      await revertActionLog(fastify.prisma, log)

      return reply.code(204).send()
    },
  )
}
