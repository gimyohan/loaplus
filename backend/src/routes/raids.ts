import type { FastifyInstance, FastifyReply } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { createRaidGateClearLog } from '../lib/actionLogs.js'
import type { RaidGateState } from '../lib/actionLogs.js'
import { buildRaidGateRewardEntries, findRaidDifficulty } from '../lib/raidCatalog.js'
import { nextDisplayOrder, toWidgetResponse } from '../lib/widgetKind.js'
import { requireAuth } from '../lib/session.js'

const createRaidSchema = z
  .object({
    // 둘 다 생략하면 목표가 없는 빈 슬롯으로 만든다 — 위젯을 추가한 뒤 설정에서 직접 고르게
    // 한다(pickHighestEligibleRaidTarget 같은 자동 추천은 더 이상 쓰지 않는다). 하나만 오는
    // 경우는 클라이언트 버그일 가능성이 높으므로 명시적으로 거부한다(아래 refine).
    raidKey: z.string().trim().min(1).optional(),
    difficultyKey: z.string().trim().min(1).optional(),
  })
  .refine((data) => (data.raidKey === undefined) === (data.difficultyKey === undefined), {
    message: 'raidKey and difficultyKey must both be present or both omitted',
  })

const targetUpdateSchema = z.object({
  raidKey: z.string().trim().min(1),
  difficultyKey: z.string().trim().min(1),
})

const moreRewardSchema = z.object({
  enabled: z.boolean(),
})

const goldRewardSchema = z.object({
  enabled: z.boolean(),
})

const gateClearSchema = z.object({ description: z.string().trim().min(1).optional() }).optional()

function toRaidResponse(raid: {
  id: string
  raidKey: string | null
  difficultyKey: string | null
  gates: unknown
  goldRewardEnabled: boolean
}) {
  return {
    raidId: raid.id,
    raidKey: raid.raidKey,
    difficultyKey: raid.difficultyKey,
    gates: raid.gates as RaidGateState[],
    goldRewardEnabled: raid.goldRewardEnabled,
  }
}

function initialGates(gateCount: number): RaidGateState[] {
  return Array.from({ length: gateCount }, () => ({ cleared: false, moreRewardEnabled: false }))
}

export async function raidRoutes(fastify: FastifyInstance) {
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

  /** 요청한 레이드 슬롯이 해당 캐릭터 소유인지 확인. 아니면 404를 응답하고 null을 반환한다. */
  async function requireOwnedRaid(characterId: string, raidId: string, reply: FastifyReply) {
    const raid = await fastify.prisma.characterRaid.findFirst({
      where: { id: raidId, characterId },
    })
    if (!raid) {
      reply.code(404).send({ error: 'raid_not_found' })
      return null
    }
    return raid
  }

  /** gateIndex 경로 파라미터를 검증한다. 범위를 벗어나면 400을 응답하고 null을 반환한다. */
  function parseGateIndex(raw: string, gateCount: number, reply: FastifyReply): number | null {
    const gateIndex = Number(raw)
    if (!Number.isInteger(gateIndex) || gateIndex < 0 || gateIndex >= gateCount) {
      reply.code(400).send({ error: 'invalid_gate_index' })
      return null
    }
    return gateIndex
  }

  fastify.post<{ Params: { characterId: string } }>(
    '/api/characters/:characterId/raids',
    { preHandler: auth, schema: { tags: ['Raid'], summary: '레이드 위젯(슬롯) 생성' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      // body 자체를 생략해도 된다(목표 없는 빈 슬롯을 카드 맨 아래에 추가).
      const parsed = createRaidSchema.safeParse(request.body ?? {})
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      // 둘 다 생략됐으면 목표가 없는 빈 슬롯으로 만든다 — 위젯을 그리드에 추가한 뒤 설정에서
      // 사용자가 직접 레이드/난이도를 고르게 한다.
      const target =
        parsed.data.raidKey !== undefined && parsed.data.difficultyKey !== undefined
          ? { raidKey: parsed.data.raidKey, difficultyKey: parsed.data.difficultyKey }
          : null

      const difficulty = target ? findRaidDifficulty(target.raidKey, target.difficultyKey) : null
      if (target && !difficulty) {
        return reply.code(400).send({ error: 'invalid_raid_target' })
      }

      const widget = await fastify.prisma.$transaction(async (tx) => {
        const raid = await tx.characterRaid.create({
          data: {
            characterId: character.id,
            raidKey: target?.raidKey ?? null,
            difficultyKey: target?.difficultyKey ?? null,
            gates: initialGates(difficulty?.gates.length ?? 0) as unknown as Prisma.InputJsonValue,
          },
        })
        return tx.dashboardWidget.create({
          data: {
            characterId: character.id,
            widgetType: 'RAID',
            // 새 레이드 위젯은 카드 맨 아래에 붙는다. 순서 변경은 PUT .../dashboards/{id}/widgets.
            displayOrder: await nextDisplayOrder(tx, character.id),
            raidId: raid.id,
          },
          include: { raid: true },
        })
      })

      return reply.code(201).send(toWidgetResponse(widget))
    },
  )

  fastify.delete<{ Params: { characterId: string; raidId: string } }>(
    '/api/characters/:characterId/raids/:raidId',
    { preHandler: auth, schema: { tags: ['Raid'], summary: '레이드 위젯(슬롯) 삭제' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const raid = await requireOwnedRaid(character.id, request.params.raidId, reply)
      if (!raid) return

      // 슬롯 자체가 없어지므로 이 슬롯의 RAID_GATE_CLEAR 로그는 롤백 없이 하드 삭제한다
      // (docs/db_schema.typ의 Character_Raids 참고). Dashboard_Widgets 행은 raid_id FK의
      // onDelete: Cascade로 함께 정리된다.
      await fastify.prisma.$transaction([
        fastify.prisma.actionLog.deleteMany({
          where: {
            characterId: character.id,
            actionType: 'RAID_GATE_CLEAR',
            revertParams: { path: ['raidId'], equals: raid.id },
          },
        }),
        fastify.prisma.characterRaid.delete({ where: { id: raid.id } }),
      ])

      return reply.code(204).send()
    },
  )

  fastify.patch<{ Params: { characterId: string; raidId: string } }>(
    '/api/characters/:characterId/raids/:raidId/target',
    { preHandler: auth, schema: { tags: ['Raid'], summary: '목표 레이드/난이도 변경' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const raid = await requireOwnedRaid(character.id, request.params.raidId, reply)
      if (!raid) return

      const parsed = targetUpdateSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const gates = raid.gates as unknown as RaidGateState[]
      if (gates.some((gate) => gate.cleared)) {
        return reply.code(409).send({ error: 'raid_already_in_progress' })
      }

      const difficulty = findRaidDifficulty(parsed.data.raidKey, parsed.data.difficultyKey)
      if (!difficulty) {
        return reply.code(400).send({ error: 'invalid_raid_target' })
      }

      const updated = await fastify.prisma.characterRaid.update({
        where: { id: raid.id },
        data: {
          raidKey: parsed.data.raidKey,
          difficultyKey: parsed.data.difficultyKey,
          gates: initialGates(difficulty.gates.length) as unknown as Prisma.InputJsonValue,
        },
      })

      return reply.send(toRaidResponse(updated))
    },
  )

  // 목표 변경(target)과 동일하게, 완료된 관문이 하나라도 있으면(gates에 cleared: true가 존재)
  // 바꿀 수 없다 — 과거에 지급된 보상/통계는 소급 조정되지 않으므로, 이미 골드를 받은 관문이
  // 있는 상태에서 값을 바꾸면 그 슬롯의 골드 획득 여부가 관문마다 뒤섞여 보이는 걸 막기 위함
  // (docs/db_schema.typ의 Character_Raids.gold_reward_enabled 참고).
  fastify.patch<{ Params: { characterId: string; raidId: string } }>(
    '/api/characters/:characterId/raids/:raidId/gold-reward',
    { preHandler: auth, schema: { tags: ['Raid'], summary: '골드 획득 허용/거부 토글' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const raid = await requireOwnedRaid(character.id, request.params.raidId, reply)
      if (!raid) return

      const parsed = goldRewardSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const gates = raid.gates as unknown as RaidGateState[]
      if (gates.some((gate) => gate.cleared)) {
        return reply.code(409).send({ error: 'raid_already_in_progress' })
      }

      const updated = await fastify.prisma.characterRaid.update({
        where: { id: raid.id },
        data: { goldRewardEnabled: parsed.data.enabled },
      })

      return reply.send(toRaidResponse(updated))
    },
  )

  fastify.post<{ Params: { characterId: string; raidId: string; gateIndex: string } }>(
    '/api/characters/:characterId/raids/:raidId/gates/:gateIndex/clear',
    { preHandler: auth, schema: { tags: ['Raid'], summary: '레이드 관문 완료 처리' } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const raid = await requireOwnedRaid(character.id, request.params.raidId, reply)
      if (!raid) return

      if (!raid.raidKey || !raid.difficultyKey) {
        // 목표를 아직 고르지 않은 빈 슬롯 — gates가 항상 빈 배열이라 관문 자체가 없다.
        return reply.code(409).send({ error: 'raid_target_not_set' })
      }

      const gates = raid.gates as unknown as RaidGateState[]
      const gateIndex = parseGateIndex(request.params.gateIndex, gates.length, reply)
      if (gateIndex === null) return

      if (gates[gateIndex].cleared) {
        return reply.code(204).send()
      }

      // 연쇄 완료는 이 엔드포인트가 처리하지 않는다 — gateIndex보다 앞선 관문이 아직 미완료면
      // 그대로 거부한다. 여러 관문을 한꺼번에 완료해야 하면(예: 3관문을 눌렀는데 1·2관문이
      // 아직 미완료) FE가 1관문부터 순서대로 이 엔드포인트를 여러 번 호출한다 — 그래야 관문마다
      // description도 각자 정확한 값으로 남는다(docs/widgets.typ "레이드" 참고).
      if (gateIndex > 0 && !gates[gateIndex - 1].cleared) {
        return reply.code(409).send({ error: 'earlier_gate_not_cleared' })
      }

      const parsed = gateClearSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const difficulty = findRaidDifficulty(raid.raidKey, raid.difficultyKey)
      if (!difficulty) {
        // raid_key/difficulty_key가 카탈로그에서 이미 사라진 경우(운영 데이터 불일치) — 보상을
        // 계산할 수 없으므로 여기서 멈춘다.
        return reply.code(500).send({ error: 'raid_catalog_inconsistent' })
      }

      // '더보기'는 관문 완료와 독립적인 별개 플래그라 보상 계산에 관여하지 않는다 — 관문을
      // 완료하면 '더보기' on/off와 무관하게 항상 표준 골드/귀속골드 보상을 그대로 로그에 남긴다.
      // 다만 이 슬롯이 지금 골드 획득을 거부(gold_reward_enabled: false) 중이면 보상을 빈
      // 배열로 넘겨 로그에 rewards가 남지 않게 하고, Character_Statistics 갱신도 건너뛴다
      // (docs/db_schema.typ의 Character_Raids.gold_reward_enabled 참고). 관문 완료 처리와
      // 연쇄 규칙 자체는 이 값과 무관하게 항상 동일하게 동작한다.
      const rewards = raid.goldRewardEnabled ? buildRaidGateRewardEntries(difficulty.gates[gateIndex]) : []

      const updated = await createRaidGateClearLog(fastify.prisma, {
        userId: request.userId!,
        characterId: character.id,
        raidId: raid.id,
        gates,
        gateIndex,
        rewards,
        description: parsed.data?.description,
      })

      return reply.send(toRaidResponse(updated))
    },
  )

  fastify.patch<{ Params: { characterId: string; raidId: string; gateIndex: string } }>(
    '/api/characters/:characterId/raids/:raidId/gates/:gateIndex/more-reward',
    { preHandler: auth, schema: { tags: ['Raid'], summary: "관문 '더보기' 토글 변경" } },
    async (request, reply) => {
      const character = await requireOwnedCharacter(request.params.characterId, request.userId!, reply)
      if (!character) return

      const raid = await requireOwnedRaid(character.id, request.params.raidId, reply)
      if (!raid) return

      if (!raid.raidKey || !raid.difficultyKey) {
        // 목표를 아직 고르지 않은 빈 슬롯 — gates가 항상 빈 배열이라 관문 자체가 없다.
        return reply.code(409).send({ error: 'raid_target_not_set' })
      }

      const gates = raid.gates as unknown as RaidGateState[]
      const gateIndex = parseGateIndex(request.params.gateIndex, gates.length, reply)
      if (gateIndex === null) return

      const parsed = moreRewardSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      gates[gateIndex] = { ...gates[gateIndex], moreRewardEnabled: parsed.data.enabled }
      const updated = await fastify.prisma.characterRaid.update({
        where: { id: raid.id },
        data: { gates: gates as unknown as Prisma.InputJsonValue },
      })

      return reply.send(toRaidResponse(updated))
    },
  )
}
