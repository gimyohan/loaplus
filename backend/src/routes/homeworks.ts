import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import {
  collectHalHourglassSand,
  getOrCreateEbonyCube,
  getOrCreateGuardian,
  getOrCreateHalHourglass,
  getOrCreateKurzanFrontline,
  getOrCreateParadise,
  GUARDIAN_REST_GAUGE_COST,
  GUARDIAN_REST_GAUGE_MAX,
  KURZAN_REST_GAUGE_COST,
  KURZAN_REST_GAUGE_MAX,
} from '../lib/homeworkDefaults.js'
import type { ActionLogCreateInput } from '../lib/actionLogs.js'
import { applyHarvestStatistics, createRewardLog, enforceActionLogCap, toLogEntry } from '../lib/actionLogs.js'
import { isChaosRiftKurzanTarget } from '../lib/contentTargets.js'
import type { TicketType } from '../lib/ebonyCubeCatalog.js'
import { ensureValidSelection, ticketColumnField, ticketCountByType, ticketTypeForKurzanTarget } from '../lib/ebonyCubeCatalog.js'
import {
  AZENA_BLESSING_REWARD_CATALOG,
  findRewardCatalogItem,
  SHARD_REWARD_CATALOG,
} from '../lib/rewardCatalog.js'
import { requireAuth } from '../lib/session.js'
import { toEbonyCubeSummary, toHalHourglassSummary } from '../lib/widgetSummaries.js'

const targetUpdateSchema = z.object({
  targetName: z.string().trim().min(1),
  restGauge: z.number().int().min(0),
  restGaugeThreshold: z.number().int().min(0),
})

const gaugeSettingsSchema = z.object({
  restGauge: z.number().int().min(0),
  restGaugeThreshold: z.number().int().min(0),
})

const paradiseSettingsSchema = z.object({
  ticketCount: z.number().int().min(0),
  keyCount: z.number().int().min(0),
  autoRecharge: z.boolean(),
})

const rewardSelectionSchema = z.object({
  itemId: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
})

const harvestSchema = z.object({ description: z.string().trim().min(1).optional() }).optional()

const otherIncomeSchema = z
  .object({
    goldAmount: z.number().int().min(0).default(0),
    boundGoldAmount: z.number().int().min(0).default(0),
    description: z.string().trim().min(1),
  })
  .refine((data) => data.goldAmount > 0 || data.boundGoldAmount > 0, {
    message: 'at least one of goldAmount/boundGoldAmount must be greater than 0',
  })

// 낙원은 귀속골드만 지급하므로(docs/statistics.typ 참고) 기타 수입과 달리 필드가 하나뿐이다.
const paradiseGoldRewardSchema = z.object({
  amount: z.number().int().min(1),
  description: z.string().trim().min(1).optional(),
})

interface HomeworkState {
  targetName: string
  restGauge: number
  restGaugeMax: number
  restGaugeThreshold: number
  isHarvested: boolean
  restGaugeConsumedByHarvest: boolean
  targetAutoManaged: boolean
}

function toHomeworkSummary(state: HomeworkState) {
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

interface ParadiseState {
  ticketCount: number
  keyCount: number
  autoRecharge: boolean
}

function toParadiseSummary(state: ParadiseState) {
  return {
    ticketCount: state.ticketCount,
    keyCount: state.keyCount,
    autoRecharge: state.autoRecharge,
  }
}

export async function homeworkRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  /** 요청한 캐릭터가 현재 유저 소유인지 확인. 아니면 404를 응답하고 null을 반환한다. */
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

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/harvest',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "가디언 토벌 '오늘 수확' 처리" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const guardian = await getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel)
      if (guardian.isHarvested) {
        return reply.code(409).send({ error: 'already_harvested' })
      }

      const parsed = harvestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const consumed = guardian.restGauge >= GUARDIAN_REST_GAUGE_COST
      const restGaugeConsumed = consumed ? GUARDIAN_REST_GAUGE_COST : 0

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedGuardian = await tx.guardian.update({
          where: { characterId: character.id },
          data: {
            isHarvested: true,
            restGauge: guardian.restGauge - restGaugeConsumed,
            restGaugeConsumedByHarvest: consumed,
          },
        })
        const now = new Date()
        await tx.actionLog.create({
          data: {
            userId: request.userId!,
            characterId: character.id,
            actionType: 'HARVEST_GUARDIAN',
            revertParams: { restGaugeConsumed },
            description: parsed.data?.description ?? null,
            createdAt: now,
          } satisfies ActionLogCreateInput,
        })
        await applyHarvestStatistics(tx, character.id, 'HARVEST_GUARDIAN', now)
        await enforceActionLogCap(tx, request.userId!)
        return updatedGuardian
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/reset',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "'오늘 수확' 완료 상태 초기화 (미사용)" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const guardian = await getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel)
      if (!guardian.isHarvested) {
        return reply.code(409).send({ error: 'not_harvested_yet' })
      }

      const updated = await fastify.prisma.guardian.update({
        where: { characterId: character.id },
        data: { isHarvested: false, restGaugeConsumedByHarvest: false },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/target',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: '대상 가디언 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = targetUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      if (
        parsed.data.restGauge > GUARDIAN_REST_GAUGE_MAX ||
        parsed.data.restGaugeThreshold > GUARDIAN_REST_GAUGE_MAX
      ) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      await getOrCreateGuardian(fastify.prisma, character.id, character.itemLevel)
      const updated = await fastify.prisma.guardian.update({
        where: { characterId: character.id },
        data: {
          targetName: parsed.data.targetName,
          restGauge: parsed.data.restGauge,
          restGaugeThreshold: parsed.data.restGaugeThreshold,
          // 유저가 대상을 직접 골랐으므로, 이후 새로고침이 아이템 레벨을 갱신해도
          // 이 값을 자동으로 다시 바꾸지 않는다.
          targetAutoManaged: false,
        },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/shard-reward',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "'편린' 퀵액션 보상 확정" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = rewardSelectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const reward = findRewardCatalogItem(SHARD_REWARD_CATALOG, parsed.data.itemId)
      if (!reward) {
        return reply.code(400).send({ error: 'invalid_reward_item' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'GUARDIAN_SHARD_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/guardian/azena-blessing-reward',
    { preHandler: auth, schema: { tags: ['Guardian'], summary: "'아제나 축복' 퀵액션 보상 확정" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = rewardSelectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const reward = findRewardCatalogItem(AZENA_BLESSING_REWARD_CATALOG, parsed.data.itemId)
      if (!reward) {
        return reply.code(400).send({ error: 'invalid_reward_item' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'GUARDIAN_AZENA_BLESSING_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/harvest',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: "쿠르잔 전선 '오늘 수확' 처리" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const kurzan = await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)
      if (kurzan.isHarvested) {
        return reply.code(409).send({ error: 'already_harvested' })
      }

      const parsed = harvestSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const consumed = kurzan.restGauge >= KURZAN_REST_GAUGE_COST
      const restGaugeConsumed = consumed ? KURZAN_REST_GAUGE_COST : 0

      const updated = await fastify.prisma.$transaction(async (tx) => {
        const updatedKurzan = await tx.kurzanFrontline.update({
          where: { characterId: character.id },
          data: {
            isHarvested: true,
            restGauge: kurzan.restGauge - restGaugeConsumed,
            restGaugeConsumedByHarvest: consumed,
          },
        })
        const now = new Date()
        await tx.actionLog.create({
          data: {
            userId: request.userId!,
            characterId: character.id,
            actionType: 'HARVEST_KURZAN',
            revertParams: { restGaugeConsumed },
            description: parsed.data?.description ?? null,
            createdAt: now,
          } satisfies ActionLogCreateInput,
        })
        await applyHarvestStatistics(tx, character.id, 'HARVEST_KURZAN', now)
        await enforceActionLogCap(tx, request.userId!)
        return updatedKurzan
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/reset',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: '공명의 비약 사용 (수확 상태 초기화 + 입장권 충전)' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const kurzan = await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)
      if (!kurzan.isHarvested) {
        return reply.code(409).send({ error: 'not_harvested_yet' })
      }

      const updated = await fastify.prisma.kurzanFrontline.update({
        where: { characterId: character.id },
        data: { isHarvested: false, restGaugeConsumedByHarvest: false },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/target',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: '대상 컨텐츠 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = gaugeSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      if (
        parsed.data.restGauge > KURZAN_REST_GAUGE_MAX ||
        parsed.data.restGaugeThreshold > KURZAN_REST_GAUGE_MAX
      ) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)
      const updated = await fastify.prisma.kurzanFrontline.update({
        where: { characterId: character.id },
        data: {
          restGauge: parsed.data.restGauge,
          restGaugeThreshold: parsed.data.restGaugeThreshold,
        },
      })

      return reply.send(toHomeworkSummary(updated))
    },
  )

  // 쿠르잔 전선 위젯의 티켓 표시 영역 클릭. 현재 target_name이 혼돈의 균열 구간이면 에브니 큐브
  // 대신 시련의 모래 스택을 적립하고(할의 모래시계와 동일한 +1/최대 5 규칙), 그 외(카오스 던전
  // 제외 — 아직 위젯 없음)는 기존처럼 target_name에 대응하는 큐브 티켓 등급을 찾아 Ebony_Cubes의
  // 그 등급 컬럼을 +1 한다. '오늘 수확' 여부와 무관하게 언제든 누를 수 있고, 둘 다 로그를 남기지
  // 않는 단순 적립이다(docs/ebony_cube_hal_hourglass.typ "쿠르잔 전선 위젯 변경" 참고).
  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/ticket/collect',
    {
      preHandler: auth,
      schema: {
        tags: ['Kurzan'],
        summary: '쿠르잔 전선 티켓 획득 클릭 (구간에 따라 에브니 큐브 등급별 +1 또는 시련의 모래 +1)',
      },
    },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const kurzan = await getOrCreateKurzanFrontline(fastify.prisma, character.id, character.itemLevel)

      if (isChaosRiftKurzanTarget(kurzan.targetName)) {
        const updated = await collectHalHourglassSand(fastify.prisma, character.id, character.itemLevel)
        return reply.send(toHalHourglassSummary(updated))
      }

      await getOrCreateEbonyCube(fastify.prisma, character.id)

      // 이 서비스는 아직 카오스 던전 위젯이 없어 target_name이 카오스 던전 스테이지일 수도 있다 —
      // 그런 경우 큐브 등급 매핑표에 없으므로 거부한다.
      const ticketType = ticketTypeForKurzanTarget(kurzan.targetName)
      if (!ticketType) {
        return reply.code(409).send({ error: 'ticket_not_available_for_target' })
      }
      const column = ticketColumnField(ticketType)
      const incremented = await fastify.prisma.ebonyCube.update({
        where: { characterId: character.id },
        data: { [column]: { increment: 1 } },
      })
      const selectedTicketType = ensureValidSelection(
        ticketCountByType(incremented),
        incremented.selectedTicketType as TicketType | null,
        ticketType,
      )
      const updated =
        selectedTicketType === incremented.selectedTicketType
          ? incremented
          : await fastify.prisma.ebonyCube.update({
              where: { characterId: character.id },
              data: { selectedTicketType },
            })

      return reply.send(toEbonyCubeSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/shard-reward',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: "'편린' 퀵액션 보상 확정" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = rewardSelectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const reward = findRewardCatalogItem(SHARD_REWARD_CATALOG, parsed.data.itemId)
      if (!reward) {
        return reply.code(400).send({ error: 'invalid_reward_item' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'KURZAN_SHARD_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/kurzan/azena-blessing-reward',
    { preHandler: auth, schema: { tags: ['Kurzan'], summary: "'아제나 축복' 퀵액션 보상 확정" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = rewardSelectionSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const reward = findRewardCatalogItem(AZENA_BLESSING_REWARD_CATALOG, parsed.data.itemId)
      if (!reward) {
        return reply.code(400).send({ error: 'invalid_reward_item' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'KURZAN_AZENA_BLESSING_REWARD',
        rewards: [reward],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/ticket/consume',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '천상 스택(티켓) 1개 소모' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const paradise = await getOrCreateParadise(fastify.prisma, character.id)
      const updated = await fastify.prisma.paradise.update({
        where: { characterId: character.id },
        data: { ticketCount: Math.max(paradise.ticketCount - 1, 0) },
      })

      return reply.send(toParadiseSummary(updated))
    },
  )

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/key/consume',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '지옥 열쇠 1개 소모' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const paradise = await getOrCreateParadise(fastify.prisma, character.id)
      const updated = await fastify.prisma.paradise.update({
        where: { characterId: character.id },
        data: { keyCount: Math.max(paradise.keyCount - 1, 0) },
      })

      return reply.send(toParadiseSummary(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/settings',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '자동 충전 등 낙원 설정 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = paradiseSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      await getOrCreateParadise(fastify.prisma, character.id)
      const updated = await fastify.prisma.paradise.update({
        where: { characterId: character.id },
        data: {
          ticketCount: parsed.data.ticketCount,
          keyCount: parsed.data.keyCount,
          autoRecharge: parsed.data.autoRecharge,
        },
      })

      return reply.send(toParadiseSummary(updated))
    },
  )

  // 낙원 보상(귀속골드) 확정. 편린/아제나 축복과 동일하게 티켓/열쇠 상태는 건드리지 않고
  // 로그(및 획득 통계 paradise_bound_gold_earned)만 남긴다 — createRewardLog 재사용
  // (docs/statistics.typ "골드 획득 카테고리" 참고, 낙원 위젯 재설계의 일부).
  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/paradise/gold-reward',
    { preHandler: auth, schema: { tags: ['Paradise'], summary: '낙원 귀속골드 획득 기록' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(
        request.params.characterId,
        request.userId!,
        reply,
      )
      if (!character) return

      const parsed = paradiseGoldRewardSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const log = await createRewardLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        actionType: 'PARADISE_GOLD_REWARD',
        rewards: [{ categoryKey: 'boundGold', itemName: '귀속골드', amount: parsed.data.amount }],
        description: parsed.data.description,
      })

      return reply.code(201).send(toLogEntry(log))
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
