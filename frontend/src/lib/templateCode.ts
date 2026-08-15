import { DEFAULT_COLUMNS, MAX_ROWS, MIN_ROWS } from '@/components/dashboard/WidgetDashboard'
import { WIDGET_CATALOG } from '@/lib/widgetCatalog'
import { collidesWithAny } from '@/lib/widgetLayout'
import type { TemplateLayout, TemplateLayoutWidget } from '@/types/template'
import type { WidgetKind } from '@/types/widget'

const VALID_KINDS = new Set<string>(WIDGET_CATALOG.map((item) => item.kind))

// DB에 저장하는 대신, 사용자가 코드를 직접 보관/공유하도록 한다 — 그래서 이 앞머리는 서버가 아니라
// 이 코드가 loaplus 배치 코드임을 알아보기 위한 표시일 뿐이다.
const CODE_PREFIX = 'LPT1-'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

/**
 * 현재 배치를 다른 사람과 그대로 주고받을 수 있는 문자열 코드로 바꾼다. 위젯의 종류·위치·크기와
 * 그리드 높이(rows)만 담고(customData나 레이드 목표/진행 상태 같은 내용은 담지 않는다) —
 * 붙여넣기만 하면 그대로 재현되는 "배치"만을 위한 코드다.
 */
export function encodeTemplateCode(widgets: TemplateLayoutWidget[], rows: number): string {
  const layout: TemplateLayout = {
    columns: DEFAULT_COLUMNS,
    rows,
    widgets: widgets.map(({ kind, x, y, w, h }) => ({ kind, x, y, w, h })),
  }
  const bytes = new TextEncoder().encode(JSON.stringify(layout))
  return CODE_PREFIX + toBase64Url(bytes)
}

/** 형식이 깨졌거나 위조된 코드는 조용히 걸러내고 유효한 항목만 남긴다. 항목이 하나도 안 남으면 null. */
export function decodeTemplateCode(code: string): TemplateLayout | null {
  const trimmed = code.trim()
  if (!trimmed.startsWith(CODE_PREFIX)) return null

  let parsed: unknown
  try {
    const json = new TextDecoder().decode(fromBase64Url(trimmed.slice(CODE_PREFIX.length)))
    parsed = JSON.parse(json)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).widgets)) {
    return null
  }

  const rawRows = (parsed as Record<string, unknown>).rows
  if (typeof rawRows !== 'number' || !Number.isFinite(rawRows)) return null
  const rows = Math.min(Math.max(Math.round(rawRows), MIN_ROWS), MAX_ROWS)

  const widgets: TemplateLayoutWidget[] = []
  for (const entry of (parsed as { widgets: unknown[] }).widgets) {
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>
    if (typeof raw.kind !== 'string' || !VALID_KINDS.has(raw.kind)) continue
    if (![raw.x, raw.y, raw.w, raw.h].every((n) => typeof n === 'number' && Number.isFinite(n))) continue

    const x = Math.max(0, Math.round(raw.x as number))
    const y = Math.max(0, Math.round(raw.y as number))
    const w = Math.max(1, Math.round(raw.w as number))
    const h = Math.max(1, Math.round(raw.h as number))
    if (x + w > DEFAULT_COLUMNS || y + h > rows) continue
    // 코드 안에서 항목끼리 겹치면(손상되었거나 손으로 조작된 코드) 먼저 나온 것만 남긴다.
    if (collidesWithAny({ x, y, w, h }, widgets)) continue

    widgets.push({ kind: raw.kind as WidgetKind, x, y, w, h })
  }

  if (widgets.length === 0) return null
  return { columns: DEFAULT_COLUMNS, rows, widgets }
}
