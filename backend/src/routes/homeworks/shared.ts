import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import {
  getOrCreateEbonyCube,
  getOrCreateGuardian,
  getOrCreateHalHourglass,
  getOrCreateKurzanFrontline,
  getOrCreateParadise,
} from '../../lib/homeworkDefaults.js'
import { createRewardLog, toLogEntry } from '../../lib/actionLogs.js'
import { requireAuth } from '../../lib/session.js'
import { toEbonyCubeSummary, toHalHourglassSummary } from '../../lib/widgetSummaries.js'

// guardian/kurzan 둘 다 '오늘 수확' 처리에 쓴다(harvest 응답 body는 선택적 description 하나뿐).
export const harvestSchema = z.object({ description: z.string().trim().min(1).optional() }).optional()

// guardian/kurzan 둘 다 '편린'/'아제나 축복' 퀵액션 보상 확정에 쓴다.
export const rewardSelectionSchema = z.object({
  itemId: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
})

const otherIncomeSchema = z
  .object({
    goldAmount: z.number().int().min(0).default(0),
    boundGoldAmount: z.number().int().min(0).default(0),
    description: z.string().trim().min(1),
  })
  .refine((data) => data.goldAmount > 0 || data.boundGoldAmount > 0, {
    message: 'at least one of goldAmount/boundGoldAmount must be greater than 0',
  })

export interface HomeworkState {
  targetName: string
  restGauge: number
  restGaugeMax: number
  restGaugeThreshold: number
  isHarvested: boolean
  restGaugeConsumedByHarvest: boolean
  targetAutoManaged: boolean
}

export function toHomeworkSummary(state: HomeworkState) {
  return {
    targetName: state.targetName,
    restGauge: state.restGauge,
    restGaugeMax: state.restGaugeMax,
    restGaugeThreshold: state.restGaugeThreshold,
    isHarvested: state.isHarvested,
    restGaugeConsumedByHarvest: state.restGaugeConsumedByHarvest,
    targetAutoManaged: state.targetAutoManaged,
  }
}

export interface ParadiseState {
  ticketCount: number
  keyCount: number
  autoRecharge: boolean
}

export function toParadiseSummary(state: ParadiseState) {
  return {
    ticketCount: state.ticketCount,
    keyCount: state.keyCount,
    autoRecharge: state.autoRecharge,
  }
}

/**
 * guardian.ts/kurzan.ts/paradise.ts 각자에서 이 이름 그대로 자기 파일 안에 다시 정의한다
 * (ebonyCubeHalHourglass.ts 등 다른 라우트 파일도 같은 패턴) — fastify 인스턴스를 클로저로
 * 잡는 8줄짜리 헬퍼라 굳이 fastify를 매개변수로 받는 공용 유틸로 뽑기보다, 각 라우트 플러그인
 * 함수 안에서 바로 보이는 지역 함수로 두는 쪽이 이 저장소의 기존 관례와 맞다.
 */
export async function homeworkSharedRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  async function requireOwnedCharacter(characterId: string, userId: string, reply: FastifyReply) {
    const character = await fastify.prisma.character.findFirst({
      where: { id: characterId, userId },
    })
    if (!character) {
      reply.code(404).send({ error: 'character_not_found' })
      return null
    }
    return character
  }

  fastify.get<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/homeworks',
    {
      preHandler: auth,
      schema: { tags: ['Homework'], summary: '가디언/쿠르잔 전선/낙원/에브니 큐브/할의 모래시계 상태 조회' },
    },
    async (request, reply) => {
      // 브라우저가 초기화 반영 전 응답을 캐싱해서 보여주는 걸 막는다 (docs/reset_logic.typ의
      // "API 데이터 HTTP Cache-Control 설정" 참고).
      reply.header('Cache-Control', 'no-store')

      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const [guardian, kurzan, paradise, ebonyCube, halHourglass] = await Promise.all([
        getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel),
        getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel),
        getOrCreateParadise(fastify.prisma, character.id),
        getOrCreateEbonyCube(fastify.prisma, character.id),
        getOrCreateHalHourglass(fastify.prisma, character.id, character.itemLevel),
      ])

      return reply.send({
        guardian: toHomeworkSummary(guardian),
        kurzan: toHomeworkSummary(kurzan),
        paradise: toParadiseSummary(paradise),
        ebonyCube: toEbonyCubeSummary(ebonyCube),
        halHourglass: toHalHourglassSummary(halHourglass),
      })
    },
  )

  // 다른 모든 Action_Logs 행위와 달리 "로그를 남기는 것 자체가 목적"인 유일한 예외 — 컨텐츠
  // 상태 변경이나 카탈로그 보상 확정의 부수 효과가 아니라, 유저가 직접 골드/귀속골드 금액과
  // 사유를 입력해 other_gold_earned/other_bound_gold_earned를 채운다. 사유는 description에
  // 그대로 저장된다(docs/statistics.typ "기타 수입 수동 기록", docs/api.typ "기타 수입 수동 기록" 참고).
  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/other-income',
    { preHandler: auth, schema: { tags: ['Income'], summary: '기타 수입 수동 기록' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = otherIncomeSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      // itemName은 다른 골드/귀속골드 보상과 동일하게 카테고리 이름만 담는다(사유 텍스트는 더 이상
      // itemName에 넣지 않는다 — 로그 목록에서 "2,500골드, 2,500골드"처럼 사유·금액 표기가
      // 보상마다 제각각이던 걸 "골드 x2,500"/"귀속골드 x2,500"으로 일반화하기 위함).
      const rewards = [
        ...(parsed.data.goldAmount > 0
          ? [{ categoryKey: 'gold', itemName: '골드', amount: parsed.data.goldAmount }]
          : []),
        ...(parsed.data.boundGoldAmount > 0
          ? [{ categoryKey: 'boundGold', itemName: '귀속골드', amount: parsed.data.boundGoldAmount }]
          : []),
      ]

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'OTHER_INCOME_MANUAL',
        rewards,
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )
}
