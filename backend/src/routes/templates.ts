import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'

import { KIND_TO_WIDGET_TYPE, WIDGET_TYPE_TO_KIND, toWidgetResponse } from '../lib/widgetKind.js'
import { requireAuth } from '../lib/session.js'

/** 위젯 종류만 위→아래 순서대로 담는다(마이그레이션 20261110120000_widget_order_model). */
interface TemplateLayoutWidget {
  kind: string
}

interface TemplateLayoutSchema {
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
    widgetCount: layout.widgets.length,
    createdAt: template.createdAt,
    ...(template.author !== undefined ? { authorNickname: template.author?.nickname ?? null } : {}),
  }
}

export async function templateRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  fastify.post(
    '/api/templates',
    { preHandler: auth, schema: { tags: ['Templates'], summary: '현재 위젯 배치를 템플릿으로 저장' } },
    async (request, reply) => {
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
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    })

    // 위젯의 종류와 순서만 스냅샷한다 — custom_data/raid 목표 같은 상태는 담지 않는다
    // (docs/db_schema.md의 Dashboard_Templates 참고).
    const layoutSchema: TemplateLayoutSchema = {
      widgets: widgets.map((widget) => ({ kind: WIDGET_TYPE_TO_KIND[widget.widgetType] })),
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

  fastify.get(
    '/api/templates',
    { preHandler: auth, schema: { tags: ['Templates'], summary: '공유된 위젯 템플릿 목록 조회' } },
    async (request, reply) => {
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
    { preHandler: auth, schema: { tags: ['Templates'], summary: '템플릿을 내 캐릭터에 적용' } },
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

      // RAID가 아닌 기존 위젯은 전부 지우고 템플릿 순서대로 다시 만든다. 기존 레이드 슬롯은
      // 건드리지 않고(슬롯 생명주기는 POST/DELETE .../raids 전용) 템플릿 위젯들 뒤로 보낸다.
      // 템플릿의 raid 항목은 그 자리에 목표가 없는 빈 레이드 슬롯을 새로 만든다.
      await fastify.prisma.$transaction(async (tx) => {
        await tx.dashboardWidget.deleteMany({
          where: { characterId: character.id, widgetType: { not: 'RAID' } },
        })
        const existingRaidWidgets = await tx.dashboardWidget.findMany({
          where: { characterId: character.id, widgetType: 'RAID' },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          select: { id: true },
        })

        for (const [index, entry] of layout.widgets.entries()) {
          if (entry.kind === 'raid') {
            const raid = await tx.characterRaid.create({
              data: { characterId: character.id, raidKey: null, difficultyKey: null, gates: [] },
            })
            await tx.dashboardWidget.create({
              data: { characterId: character.id, widgetType: 'RAID', displayOrder: index, raidId: raid.id },
            })
          } else {
            await tx.dashboardWidget.create({
              data: {
                characterId: character.id,
                widgetType: KIND_TO_WIDGET_TYPE[entry.kind as keyof typeof KIND_TO_WIDGET_TYPE],
                displayOrder: index,
              },
            })
          }
        }

        for (const [offset, widget] of existingRaidWidgets.entries()) {
          await tx.dashboardWidget.update({
            where: { id: widget.id },
            data: { displayOrder: layout.widgets.length + offset },
          })
        }
      })

      const widgets = await fastify.prisma.dashboardWidget.findMany({
        where: { characterId: character.id },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        include: { raid: true },
      })

      return reply.send({ widgets: widgets.map(toWidgetResponse) })
    },
  )
}
