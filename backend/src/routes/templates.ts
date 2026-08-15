import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { KIND_TO_WIDGET_TYPE, WIDGET_TYPE_TO_KIND, toWidgetResponse } from '../lib/widgetKind.js'
import { requireAuth } from '../lib/session.js'

interface TemplateLayoutWidget {
  kind: string
  x: number
  y: number
  w: number
  h: number
}

interface TemplateLayoutSchema {
  columns: number
  rows: number
  widgets: TemplateLayoutWidget[]
}

const createTemplateSchema = z.object({
  characterId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
})

const applyTemplateSchema = z.object({
  characterId: z.string().uuid(),
})

const listQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest']).default('newest'),
  search: z.string().trim().min(1).optional(),
})

function toTemplateSummary(template: {
  id: string
  title: string
  description: string | null
  layoutSchema: unknown
  createdAt: Date
  author?: { nickname: string | null } | null
}) {
  const layout = template.layoutSchema as TemplateLayoutSchema
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    columns: layout.columns,
    rows: layout.rows,
    widgetCount: layout.widgets.length,
    createdAt: template.createdAt,
    ...(template.author !== undefined ? { authorNickname: template.author?.nickname ?? null } : {}),
  }
}

export async function templateRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  fastify.post('/api/templates', { preHandler: auth }, async (request, reply) => {
    const parsed = createTemplateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const character = await fastify.prisma.character.findFirst({
      where: { id: parsed.data.characterId, userId: request.userId! },
    })
    if (!character) {
      return reply.code(404).send({ error: 'character_not_found' })
    }

    const widgets = await fastify.prisma.dashboardWidget.findMany({
      where: { characterId: character.id },
    })

    // 위젯의 종류와 위치만 스냅샷한다 — custom_data/raid 목표 같은 상태는 담지 않는다
    // (docs/db_schema.typ의 Dashboard_Templates 참고).
    const layoutSchema: TemplateLayoutSchema = {
      columns: character.gridColumns,
      rows: character.gridRows,
      widgets: widgets.map((widget) => ({
        kind: WIDGET_TYPE_TO_KIND[widget.widgetType],
        x: widget.gridX,
        y: widget.gridY,
        w: widget.width,
        h: widget.height,
      })),
    }

    const template = await fastify.prisma.dashboardTemplate.create({
      data: {
        authorUserId: request.userId!,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        layoutSchema: layoutSchema as unknown as Prisma.InputJsonValue,
      },
    })

    return reply.code(201).send(toTemplateSummary(template))
  })

  fastify.get('/api/templates', { preHandler: auth }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const templates = await fastify.prisma.dashboardTemplate.findMany({
      where: parsed.data.search
        ? { title: { contains: parsed.data.search, mode: 'insensitive' } }
        : undefined,
      orderBy: { createdAt: parsed.data.sort === 'oldest' ? 'asc' : 'desc' },
      include: { author: { select: { nickname: true } } },
    })

    return reply.send(templates.map(toTemplateSummary))
  })

  fastify.post<{ Params: { templateId: string } }>(
    '/api/templates/:templateId/apply',
    { preHandler: auth },
    async (request, reply) => {
      const parsed = applyTemplateSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const template = await fastify.prisma.dashboardTemplate.findFirst({
        where: { id: request.params.templateId },
      })
      if (!template) {
        return reply.code(404).send({ error: 'template_not_found' })
      }

      const character = await fastify.prisma.character.findFirst({
        where: { id: parsed.data.characterId, userId: request.userId! },
      })
      if (!character) {
        return reply.code(404).send({ error: 'character_not_found' })
      }

      const layout = template.layoutSchema as unknown as TemplateLayoutSchema
      const raidEntries = layout.widgets.filter((widget) => widget.kind === 'raid')
      const otherEntries = layout.widgets.filter((widget) => widget.kind !== 'raid')

      await fastify.prisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: character.id },
          data: { gridColumns: layout.columns, gridRows: layout.rows },
        })

        // RAID가 아닌 기존 배치를 전부 지우고 템플릿 내용으로 다시 채운다 (PUT .../widgets의
        // replace-all과 동일한 원칙 — 기존 RAID 위젯은 건드리지 않음).
        await tx.dashboardWidget.deleteMany({
          where: { characterId: character.id, widgetType: { not: 'RAID' } },
        })
        if (otherEntries.length > 0) {
          await tx.dashboardWidget.createMany({
            data: otherEntries.map((widget) => ({
              characterId: character.id,
              widgetType: KIND_TO_WIDGET_TYPE[widget.kind as keyof typeof KIND_TO_WIDGET_TYPE],
              gridX: widget.x,
              gridY: widget.y,
              width: widget.w,
              height: widget.h,
            })),
          })
        }

        // 템플릿의 raid 항목 개수만큼, 목표가 없는 빈 레이드 슬롯을 새로 추가한다 — 기존 레이드
        // 슬롯은 건드리지 않는다(레이드 슬롯 생명주기는 POST/DELETE .../raids 전용, 위 참고).
        for (const raidWidget of raidEntries) {
          const raid = await tx.characterRaid.create({
            data: { characterId: character.id, raidKey: null, difficultyKey: null, gates: [] },
          })
          await tx.dashboardWidget.create({
            data: {
              characterId: character.id,
              widgetType: 'RAID',
              gridX: raidWidget.x,
              gridY: raidWidget.y,
              width: raidWidget.w,
              height: raidWidget.h,
              raidId: raid.id,
            },
          })
        }
      })

      const widgets = await fastify.prisma.dashboardWidget.findMany({
        where: { characterId: character.id },
        include: { raid: true },
      })

      return reply.send({
        columns: layout.columns,
        rows: layout.rows,
        widgets: widgets.map(toWidgetResponse),
      })
    },
  )
}
