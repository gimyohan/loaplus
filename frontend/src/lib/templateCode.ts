import { WIDGET_CATALOG } from '@/lib/widgetCatalog'
import type { TemplateLayout, TemplateLayoutWidget } from '@/types/template'
import type { WidgetKind } from '@/types/widget'

const VALID_KINDS = new Set<string>(WIDGET_CATALOG.map((item) => item.kind))

// DB에 저장하는 대신, 사용자가 코드를 직접 보관/공유하도록 한다 — 그래서 이 앞머리는 서버가 아니라
// 이 코드가 loaplus 배치 코드임을 알아보기 위한 표시일 뿐이다.
// LPT2: { widgets: [{ kind }] } — 위→아래 순서(카드 순서 모델, docs/ui_redesign.md).
// LPT1: 예전 그리드 배치 { columns, rows, widgets: [{ kind, x, y, w, h }] } — 이미 공유된 코드와
//       기본 배치(data/defaultLayouts.ts)를 계속 읽을 수 있도록, 읽는 순서(위→아래, 왼→오른쪽)로
//       정렬해 종류 목록으로 바꿔 읽는다(DB 마이그레이션 20261110120000_widget_order_model과 같은 규칙).
const CODE_PREFIX = 'LPT2-'
const LEGACY_GRID_CODE_PREFIX = 'LPT1-'

// 손상되거나 조작된 코드로 위젯이 터무니없이 많이 생기지 않게 막는다(백엔드 상한과 같다).
const MAX_WIDGETS = 60

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
 * 현재 배치를 다른 사람과 그대로 주고받을 수 있는 문자열 코드로 바꾼다. 위젯의 종류와 순서만
 * 담는다(customData나 레이드 목표/진행 상태 같은 내용은 담지 않는다).
 */
export function encodeTemplateCode(widgets: TemplateLayoutWidget[]): string {
  const layout: TemplateLayout = { widgets: widgets.map(({ kind }) => ({ kind })) }
  const bytes = new TextEncoder().encode(JSON.stringify(layout))
  return CODE_PREFIX + toBase64Url(bytes)
}

function decodePayload(encoded: string): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)))
  } catch {
    return null
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 형식이 깨졌거나 위조된 코드는 조용히 걸러내고 유효한 항목만 남긴다. 항목이 하나도 안 남으면 null. */
export function decodeTemplateCode(code: string): TemplateLayout | null {
  const trimmed = code.trim()
  const isLegacy = trimmed.startsWith(LEGACY_GRID_CODE_PREFIX)
  if (!isLegacy && !trimmed.startsWith(CODE_PREFIX)) return null

  const parsed = decodePayload(trimmed.slice(CODE_PREFIX.length))
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).widgets)) {
    return null
  }

  let entries = (parsed as { widgets: unknown[] }).widgets.filter(
    (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object',
  )
  if (isLegacy) {
    entries = entries
      .filter((entry) => isFiniteNumber(entry.x) && isFiniteNumber(entry.y))
      .sort((a, b) => (a.y as number) - (b.y as number) || (a.x as number) - (b.x as number))
  }

  const widgets: TemplateLayoutWidget[] = entries
    .filter((entry) => typeof entry.kind === 'string' && VALID_KINDS.has(entry.kind))
    .slice(0, MAX_WIDGETS)
    .map((entry) => ({ kind: entry.kind as WidgetKind }))

  if (widgets.length === 0) return null
  return { widgets }
}
