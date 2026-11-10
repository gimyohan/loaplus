import type { Prisma, PrismaClient, WidgetType } from '@prisma/client'

// workspace/frontend/src/types/widget.ts의 WidgetKind(카멜케이스)와 Dashboard_Widgets.widget_type
// Enum(docs/db_schema.typ)을 1:1로 매핑한다. API는 프론트가 이미 쓰는 카멜케이스 kind를 그대로 쓴다.
export const KIND_TO_WIDGET_TYPE = {
  banner: 'BANNER',
  bannerCompact: 'BANNER_COMPACT',
  bannerDetailed: 'BANNER_DETAILED',
  guardian: 'GUARDIAN',
  kurzanFrontline: 'KURZAN_FRONTLINE',
  paradise: 'PARADISE',
  raid: 'RAID',
  ebonyCube: 'EBONY_CUBE',
  halHourglass: 'HAL_HOURGLASS',
  text: 'TEXT',
  textCheckbox: 'TEXT_CHECKBOX',
  linkIcon: 'LINK_ICON',
  image: 'IMAGE',
  counter: 'COUNTER',
} as const satisfies Record<string, WidgetType>

export type WidgetKind = keyof typeof KIND_TO_WIDGET_TYPE

export const WIDGET_TYPE_TO_KIND = Object.fromEntries(
  Object.entries(KIND_TO_WIDGET_TYPE).map(([kind, widgetType]) => [widgetType, kind]),
) as Record<WidgetType, WidgetKind>

// Additional Value 위젯(위젯 자체에 종속되는 커스텀 데이터를 갖는 kind). /api/widgets/custom은
// 이 kind들만 다룬다 — Default Value 위젯(banner/guardian/kurzanFrontline/paradise/raid)은
// PUT /api/dashboards/{characterId}/widgets로만 배치한다 (docs/api.typ 참고).
export const ADDITIONAL_VALUE_KINDS = [
  'text',
  'textCheckbox',
  'linkIcon',
  'image',
  'counter',
] as const satisfies WidgetKind[]

/** 이 캐릭터 카드의 맨 아래(가장 큰 display_order + 1) 순서. 위젯을 하나씩 추가할 때 끝에 붙인다. */
export async function nextDisplayOrder(
  prisma: Pick<PrismaClient, 'dashboardWidget'> | Prisma.TransactionClient,
  characterId: string,
): Promise<number> {
  const result = await prisma.dashboardWidget.aggregate({
    where: { characterId },
    _max: { displayOrder: true },
  })
  return (result._max.displayOrder ?? -1) + 1
}

/** 위젯 응답. 배열 자체가 위→아래 순서이므로(호출부가 display_order로 정렬) 순서 값은 따로 싣지 않는다. */
export function toWidgetResponse(widget: {
  id: string
  widgetType: WidgetType
  customData: unknown
  raidId?: string | null
  raid?: { raidKey: string | null; difficultyKey: string | null; gates: unknown; goldRewardEnabled: boolean } | null
}) {
  return {
    id: widget.id,
    kind: WIDGET_TYPE_TO_KIND[widget.widgetType],
    customData: widget.customData ?? null,
    // widget_type이 RAID일 때만 값이 채워진다 (docs/db_schema.typ의 Dashboard_Widgets 참고).
    ...(widget.widgetType === 'RAID'
      ? {
          raidId: widget.raidId ?? null,
          raid: widget.raid
            ? {
                raidKey: widget.raid.raidKey,
                difficultyKey: widget.raid.difficultyKey,
                gates: widget.raid.gates,
                goldRewardEnabled: widget.raid.goldRewardEnabled,
              }
            : null,
        }
      : {}),
  }
}
