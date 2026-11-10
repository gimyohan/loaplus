import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { applyLazyReset } from '../lib/resetLogic.js'
import { KIND_TO_WIDGET_TYPE, toWidgetResponse } from '../lib/widgetKind.js'
import { requireAuth } from '../lib/session.js'

const cardOrderSchema = z.object({
  characterIds: z.array(z.string().uuid()),
})

const cardSwapSchema = z.object({
  characterIdA: z.string().uuid(),
  characterIdB: z.string().uuid(),
})

// 레이드는 Character_Raids 행이 함께 있어야 성립하므로 이 엔드포인트로 새로 만들 수 없다(POST
// .../raids 전용). 이미 있는 레이드 위젯은 id로 순서만 옮길 수 있다.
const NEW_WIDGET_KINDS = Object.keys(KIND_TO_WIDGET_TYPE).filter((kind) => kind !== 'raid') as [string, ...string[]]

/** 순서 배열의 한 칸: 이미 있는 위젯은 id만, 새로 추가하는 위젯은 kind(+ 초기 customData). */
const widgetOrderEntrySchema = z.union([
  z.object({ id: z.string().uuid() }).strict(),
  z.object({ kind: z.enum(NEW_WIDGET_KINDS), customData: z.unknown().optional() }).strict(),
])

const MAX_WIDGETS_PER_CARD = 60

const widgetOrderSchema = z.object({
  widgets: z.array(widgetOrderEntrySchema).max(MAX_WIDGETS_PER_CARD),
})

export async function dashboardRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  async function getCardOrder(userId: string) {
    const characters = await fastify.prisma.character.findMany({
      where: { userId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: { id: true },
    })
    return characters.map((character) => character.id)
  }

  fastify.get(
    '/api/dashboards',
    { preHandler: auth, schema: { tags: ['Dashboard'], summary: '캐릭터 카드 순서 조회' } },
    async (request, reply) => {
    // 브라우저가 초기화 반영 전 응답을 캐싱해서 보여주는 걸 막는다 (docs/reset_logic.typ의
    // "API 데이터 HTTP Cache-Control 설정" 참고).
    reply.header('Cache-Control', 'no-store')
    // 지연 평가 초기화의 유일한 트리거 지점 (docs/reset_logic.typ 참고). 카드 순서 조회 자체와는
    // 무관하지만, 프론트가 대시보드 진입 시 가장 먼저 호출하는 엔드포인트라 여기서 판단한다.
    await applyLazyReset(fastify.prisma, request.userId!)

    return reply.send(await getCardOrder(request.userId!))
  })

  fastify.put(
    '/api/dashboards',
    { preHandler: auth, schema: { tags: ['Dashboard'], summary: '카드 순서 저장(전체 교체)' } },
    async (request, reply) => {
    const parsed = cardOrderSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const owned = await fastify.prisma.character.findMany({
      where: { userId: request.userId! },
      select: { id: true },
    })
    const ownedIds = new Set(owned.map((character) => character.id))
    const inputIds = parsed.data.characterIds

    // body는 내 캐릭터 전체를 정확히 한 번씩만 포함해야 한다 (누락/추가/중복 모두 거부).
    if (
      inputIds.length !== ownedIds.size ||
      new Set(inputIds).size !== inputIds.length ||
      !inputIds.every((id) => ownedIds.has(id))
    ) {
      return reply.code(400).send({ error: 'invalid_character_set' })
    }

    await fastify.prisma.$transaction(
      inputIds.map((id, index) =>
        fastify.prisma.character.update({ where: { id }, data: { displayOrder: index } }),
      ),
    )

    return reply.send(inputIds)
  })

  fastify.patch(
    '/api/dashboards/swap',
    { preHandler: auth, schema: { tags: ['Dashboard'], summary: '카드 두 개의 순서 맞바꾸기' } },
    async (request, reply) => {
    const parsed = cardSwapSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }
    if (parsed.data.characterIdA === parsed.data.characterIdB) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const [characterA, characterB] = await Promise.all([
      fastify.prisma.character.findFirst({
        where: { id: parsed.data.characterIdA, userId: request.userId! },
      }),
      fastify.prisma.character.findFirst({
        where: { id: parsed.data.characterIdB, userId: request.userId! },
      }),
    ])
    if (!characterA || !characterB) {
      return reply.code(404).send({ error: 'character_not_found' })
    }

    // 끼워넣기(insert)가 아니라 두 카드의 display_order만 서로 교환한다 — 그 사이 다른
    // 카드들의 순서는 건드리지 않는다 (docs/api.typ의 대시보드 섹션 참고).
    await fastify.prisma.$transaction([
      fastify.prisma.character.update({
        where: { id: characterA.id },
        data: { displayOrder: characterB.displayOrder },
      }),
      fastify.prisma.character.update({
        where: { id: characterB.id },
        data: { displayOrder: characterA.displayOrder },
      }),
    ])

    return reply.send(await getCardOrder(request.userId!))
  })

  async function listWidgets(characterId: string) {
    const widgets = await fastify.prisma.dashboardWidget.findMany({
      where: { characterId },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      include: { raid: true },
    })
    return { widgets: widgets.map(toWidgetResponse) }
  }

  fastify.get<{ Params: { characterId: string } }>(
    '/api/dashboards/:characterId/widgets',
    { preHandler: auth, schema: { tags: ['Dashboard'], summary: '캐릭터 카드의 위젯 목록 조회(위→아래 순서)' } },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store')

      const character = await fastify.prisma.character.findFirst({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }

      return reply.send(await listWidgets(character.id))
    },
  )

  // 카드의 위젯 목록을 위→아래 순서 배열로 통째로 맞춘다. 배열에 id로 남은 위젯은 그대로 두고
  // 순서만 바꾸며(id·custom_data 유지), kind로 들어온 항목은 새로 만들고, 배열에서 빠진 기존
  // 위젯은 삭제한다. 레이드 위젯은 여기서 지울 수 없다 — 슬롯 삭제는 관문 로그 정리가 함께
  // 필요해 DELETE .../raids/{raidId} 전용이므로, 기존 레이드 위젯은 전부 배열에 있어야 한다.
  fastify.put<{ Params: { characterId: string } }>(
    '/api/dashboards/:characterId/widgets',
    { preHandler: auth, schema: { tags: ['Dashboard'], summary: '위젯 순서·추가·삭제를 순서 배열로 저장' } },
    async (request, reply) => {
      const character = await fastify.prisma.character.findFirst({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }

      const parsed = widgetOrderSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      const entries = parsed.data.widgets

      const existing = await fastify.prisma.dashboardWidget.findMany({
        where: { characterId: character.id },
        select: { id: true, widgetType: true },
      })
      const existingIds = new Set(existing.map((widget) => widget.id))
      const keptIds = entries.flatMap((entry) => ('id' in entry ? [entry.id] : []))

      if (new Set(keptIds).size !== keptIds.length || !keptIds.every((id) => existingIds.has(id))) {
        return reply.code(400).send({ error: 'unknown_widget' })
      }
      const keptIdSet = new Set(keptIds)
      if (existing.some((widget) => widget.widgetType === 'RAID' && !keptIdSet.has(widget.id))) {
        return reply.code(400).send({ error: 'raid_widget_missing' })
      }

      await fastify.prisma.$transaction(async (tx) => {
        await tx.dashboardWidget.deleteMany({
          where: { characterId: character.id, id: { notIn: keptIds } },
        })
        for (const [index, entry] of entries.entries()) {
          if ('id' in entry) {
            await tx.dashboardWidget.update({ where: { id: entry.id }, data: { displayOrder: index } })
          } else {
            await tx.dashboardWidget.create({
              data: {
                characterId: character.id,
                widgetType: KIND_TO_WIDGET_TYPE[entry.kind as keyof typeof KIND_TO_WIDGET_TYPE],
                displayOrder: index,
                customData:
                  entry.customData === undefined ? undefined : (entry.customData as Prisma.InputJsonValue),
              },
            })
          }
        }
      })

      return reply.send(await listWidgets(character.id))
    },
  )
}
