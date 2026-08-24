import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { requireAuth } from '../lib/session.js'

// docs/ability_stone.typ "상태 → 정수 인덱스 인코딩" 참고. rem/fail/succ 카운트는 0~10,
// curr_probability_idx는 0~5(실제 확률 25%~75%를 10%p 단위로 표현)만 유효하다.
const strategyQuerySchema = z.object({
  majorFailCnt: z.coerce.number().int().min(0).max(10),
  minorFailCnt: z.coerce.number().int().min(0).max(10),
  debuffSuccCnt: z.coerce.number().int().min(0).max(10),
  majorRemCnt: z.coerce.number().int().min(0).max(10),
  minorRemCnt: z.coerce.number().int().min(0).max(10),
  debuffRemCnt: z.coerce.number().int().min(0).max(10),
  currProbabilityIdx: z.coerce.number().int().min(0).max(5),
})

/** 7개 원시 상태값을 11진수 자릿수처럼 누적해 state_key를 계산한다 (main.cpp의 pack_state_key_base11과 동일). */
function computeStateKey(values: {
  majorFailCnt: number
  minorFailCnt: number
  debuffSuccCnt: number
  majorRemCnt: number
  minorRemCnt: number
  debuffRemCnt: number
  currProbabilityIdx: number
}): number {
  const order = [
    values.majorFailCnt,
    values.minorFailCnt,
    values.debuffSuccCnt,
    values.majorRemCnt,
    values.minorRemCnt,
    values.debuffRemCnt,
    values.currProbabilityIdx,
  ]
  return order.reduce((acc, d) => acc * 11 + d, 0)
}

export async function abilityStoneRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  fastify.get(
    '/api/ability-stone/strategy',
    { preHandler: auth, schema: { tags: ['AbilityStone'], summary: '어빌리티 스톤 최적 전략(DP) 조회' } },
    async (request, reply) => {
    const parsed = strategyQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const stateKey = computeStateKey(parsed.data)
    const state = await fastify.prisma.abilityStoneDpState.findUnique({ where: { stateKey } })
    if (!state) {
      return reply.code(400).send({ error: 'invalid_state' })
    }

    return reply.send(state.outcomes)
  })
}
