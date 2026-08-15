import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { applyLazyReset } from '../lib/resetLogic.js'
import { KIND_TO_WIDGET_TYPE, toWidgetResponse } from '../lib/widgetKind.js'
import { requireAuth } from '../lib/session.js'

const MAX_COLUMNS = 30
const MAX_ROWS = 60

const cardOrderSchema = z.object({
  characterIds: z.array(z.string().uuid()),
})

const cardSwapSchema = z.object({
  characterIdA: z.string().uuid(),
  characterIdB: z.string().uuid(),
})

const widgetInputSchema = z.object({
  kind: z.enum(Object.keys(KIND_TO_WIDGET_TYPE) as [string, ...string[]]),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  customData: z.unknown().optional(),
})

const widgetsLayoutSchema = z.object({
  columns: z.number().int().min(1).max(MAX_COLUMNS),
  rows: z.number().int().min(1).max(MAX_ROWS),
  widgets: z.array(widgetInputSchema),
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

  fastify.get('/api/dashboards', { preHandler: auth }, async (request, reply) => {
    // 브라우저가 초기화 반영 전 응답을 캐싱해서 보여주는 걸 막는다 (docs/reset_logic.typ의
    // "API 데이터 HTTP Cache-Control 설정" 참고).
    reply.header('Cache-Control', 'no-store')
    // 지연 평가 초기화의 유일한 트리거 지점 (docs/reset_logic.typ 참고). 카드 순서 조회 자체와는
    // 무관하지만, 프론트가 대시보드 진입 시 가장 먼저 호출하는 엔드포인트라 여기서 판단한다.
    await applyLazyReset(fastify.prisma, request.userId!)

    return reply.send(await getCardOrder(request.userId!))
  })

  fastify.put('/api/dashboards', { preHandler: auth }, async (request, reply) => {
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

  fastify.patch('/api/dashboards/swap', { preHandler: auth }, async (request, reply) => {
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

  fastify.get<{ Params: { characterId: string } }>(
    '/api/dashboards/:characterId/widgets',
    { preHandler: auth },
    async (request, reply) => {
      reply.header('Cache-Control', 'no-store')

      const character = await fastify.prisma.character.findFirst({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }

      const widgets = await fastify.prisma.dashboardWidget.findMany({
        where: { characterId: character.id },
        include: { raid: true },
      })

      return reply.send({
        columns: character.gridColumns,
        rows: character.gridRows,
        widgets: widgets.map(toWidgetResponse),
      })
    },
  )

  fastify.put<{ Params: { characterId: string } }>(
    '/api/dashboards/:characterId/widgets',
    { preHandler: auth },
    async (request, reply) => {
      const character = await fastify.prisma.character.findFirst({
        where: { id: request.params.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }

      const parsed = widgetsLayoutSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      // RAID는 이 replace-all로 만들거나 옮길 수 없다 — 삭제 후 재생성 방식이라
      // Character_Raids 참조를 보존할 수 없기 때문 (docs/db_schema.typ의 Dashboard_Widgets 참고).
      if (parsed.data.widgets.some((widget) => widget.kind === 'raid')) {
        return reply.code(400).send({ error: 'raid_widget_not_allowed' })
      }

      // 그리드 크기 갱신 + 위젯 전체 교체(기존 삭제 후 새로 생성)를 한 트랜잭션으로 처리한다.
      // 기존 RAID 위젯 행은 건드리지 않는다(자체 생명주기는 POST/DELETE .../raids가 관리).
      const [, , widgets] = await fastify.prisma.$transaction([
        fastify.prisma.character.update({
          where: { id: character.id },
          data: { gridColumns: parsed.data.columns, gridRows: parsed.data.rows },
        }),
        fastify.prisma.dashboardWidget.deleteMany({
          where: { characterId: character.id, widgetType: { not: 'RAID' } },
        }),
        fastify.prisma.dashboardWidget.createManyAndReturn({
          data: parsed.data.widgets.map((widget) => ({
            characterId: character.id,
            widgetType: KIND_TO_WIDGET_TYPE[widget.kind as keyof typeof KIND_TO_WIDGET_TYPE],
            gridX: widget.x,
            gridY: widget.y,
            width: widget.w,
            height: widget.h,
            customData:
              widget.customData === undefined ? undefined : (widget.customData as Prisma.InputJsonValue),
          })),
        }),
      ])

      return reply.send({
        columns: parsed.data.columns,
        rows: parsed.data.rows,
        widgets: widgets.map(toWidgetResponse),
      })
    },
  )
}
