import type { FastifyInstance, FastifyReply } from 'fastify'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

import { requireAuth } from '../lib/session.js'
import { ADDITIONAL_VALUE_KINDS, KIND_TO_WIDGET_TYPE, toWidgetResponse } from '../lib/widgetKind.js'

const createWidgetSchema = z.object({
  characterId: z.string().uuid(),
  kind: z.enum(ADDITIONAL_VALUE_KINDS),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  customData: z.unknown().optional(),
})

const updateWidgetSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  customData: z.unknown().optional(),
})

const checkSchema = z.object({
  isChecked: z.boolean(),
})

function toInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue)
}

export async function customWidgetRoutes(fastify: FastifyInstance) {
  const auth = requireAuth(fastify)

  /** 요청한 위젯이 현재 유저 소유 캐릭터에 속하는지 확인. 아니면 404를 응답하고 null을 반환한다. */
  async function requireOwnedWidget(widgetId: string, userId: string, reply: FastifyReply) {
    const widget = await fastify.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, character: { userId } },
    })
    if (!widget) {
      reply.code(404).send({ error: 'widget_not_found' })
      return null
    }
    return widget
  }

  fastify.post(
    '/api/widgets/custom',
    { preHandler: auth, schema: { tags: ['CustomWidgets'], summary: '커스텀(Additional Value) 위젯 생성' } },
    async (request, reply) => {
    const parsed = createWidgetSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_request' })
    }

    const character = await fastify.prisma.character.findFirst({
      where: { id: parsed.data.characterId, userId: request.userId! },
    })
    if (!character) {
      return reply.code(404).send({ error: 'character_not_found' })
    }

    const widget = await fastify.prisma.dashboardWidget.create({
      data: {
        characterId: character.id,
        widgetType: KIND_TO_WIDGET_TYPE[parsed.data.kind],
        gridX: parsed.data.x,
        gridY: parsed.data.y,
        width: parsed.data.w,
        height: parsed.data.h,
        customData: toInputJson(parsed.data.customData),
      },
    })

    return reply.code(201).send(toWidgetResponse(widget))
  })

  fastify.put<{ Params: { widgetId: string } }>(
    '/api/widgets/custom/:widgetId',
    { preHandler: auth, schema: { tags: ['CustomWidgets'], summary: '커스텀 위젯 배치·데이터 수정(전체 교체)' } },
    async (request, reply) => {
      const widget = await requireOwnedWidget(request.params.widgetId, request.userId!, reply)
      if (!widget) return

      const parsed = updateWidgetSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      const updated = await fastify.prisma.dashboardWidget.update({
        where: { id: widget.id },
        data: {
          gridX: parsed.data.x,
          gridY: parsed.data.y,
          width: parsed.data.w,
          height: parsed.data.h,
          customData: toInputJson(parsed.data.customData) ?? Prisma.JsonNull,
        },
      })

      return reply.send(toWidgetResponse(updated))
    },
  )

  fastify.delete<{ Params: { widgetId: string } }>(
    '/api/widgets/custom/:widgetId',
    { preHandler: auth, schema: { tags: ['CustomWidgets'], summary: '커스텀 위젯 삭제' } },
    async (request, reply) => {
      const widget = await requireOwnedWidget(request.params.widgetId, request.userId!, reply)
      if (!widget) return

      await fastify.prisma.dashboardWidget.delete({ where: { id: widget.id } })

      return reply.code(204).send()
    },
  )

  fastify.patch<{ Params: { widgetId: string } }>(
    '/api/widgets/custom/:widgetId/check',
    { preHandler: auth, schema: { tags: ['CustomWidgets'], summary: '텍스트&체크박스 위젯 체크 상태 갱신' } },
    async (request, reply) => {
      const widget = await requireOwnedWidget(request.params.widgetId, request.userId!, reply)
      if (!widget) return

      if (widget.widgetType !== 'TEXT_CHECKBOX') {
        return reply.code(400).send({ error: 'not_a_checkbox_widget' })
      }

      const parsed = checkSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_request' })
      }

      // customData의 다른 필드(text, resetDays)는 그대로 두고 isChecked만 갱신한다.
      const existingCustomData = (widget.customData as Record<string, unknown> | null) ?? {}
      const wasChecked = Boolean(existingCustomData.isChecked)
      const nextChecked = parsed.data.isChecked

      // remainingCount는 실제로 상태가 바뀔 때만("같은 값 다시 보내기"는 무시) 갱신한다 —
      // 미체크→체크는 -1(0 미만 방지), 체크→미체크는 +1. null이면(카운터 미사용) 건드리지
      // 않는다 (docs/db_schema.typ의 Dashboard_Widgets "텍스트&체크박스 예시" 참고).
      const currentRemainingCount =
        typeof existingCustomData.remainingCount === 'number' ? existingCustomData.remainingCount : null
      const nextRemainingCount =
        currentRemainingCount === null || nextChecked === wasChecked
          ? currentRemainingCount
          : nextChecked
            ? Math.max(currentRemainingCount - 1, 0)
            : currentRemainingCount + 1

      const updated = await fastify.prisma.dashboardWidget.update({
        where: { id: widget.id },
        data: {
          customData: {
            ...existingCustomData,
            isChecked: nextChecked,
            ...(currentRemainingCount === null ? {} : { remainingCount: nextRemainingCount }),
          } satisfies Prisma.InputJsonValue,
        },
      })

      return reply.send(toWidgetResponse(updated))
    },
  )

  fastify.patch<{ Params: { widgetId: string } }>(
    '/api/widgets/custom/:widgetId/decrement',
    { preHandler: auth, schema: { tags: ['CustomWidgets'], summary: '카운터 위젯 값 1 감소' } },
    async (request, reply) => {
      const widget = await requireOwnedWidget(request.params.widgetId, request.userId!, reply)
      if (!widget) return

      if (widget.widgetType !== 'COUNTER') {
        return reply.code(400).send({ error: 'not_a_counter_widget' })
      }

      // 서버에 저장된 값을 기준으로 계산한다 — 클릭할 때마다 이 엔드포인트만 부르면 되고(값을
      // 직접 계산해 보낼 필요 없음), 프론트가 낙관적으로 먼저 반영한 값이 실제 저장값과
      // 어긋나 있어도(예: 다른 탭에서 동시에 클릭) 항상 서버 값 기준으로 정확히 1만 줄어든다.
      const existingCustomData = (widget.customData as Record<string, unknown> | null) ?? {}
      const currentCount = typeof existingCustomData.count === 'number' ? existingCustomData.count : 0

      const updated = await fastify.prisma.dashboardWidget.update({
        where: { id: widget.id },
        data: {
          customData: {
            ...existingCustomData,
            count: Math.max(currentCount - 1, 0),
          } satisfies Prisma.InputJsonValue,
        },
      })

      return reply.send(toWidgetResponse(updated))
    },
  )
}
