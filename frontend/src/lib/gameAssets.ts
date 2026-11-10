import type { TicketType } from '@/types/ebonyCube'

// 로스트아크 공식 에셋 CDN(docs/asset_cdn.md). 게임 아이콘은 efui_iconatlas/{아틀라스}/{파일}.png 경로이며
// CORS가 열려 있어 그대로 불러 쓸 수 있다. 다른 서드파티의 미러(pica.korlark.com 등)는 쓰지 않는다.
export const LOSTARK_CDN_BASE = 'https://cdn-lostark.game.onstove.com'

function iconAtlas(path: string) {
  return `${LOSTARK_CDN_BASE}/efui_iconatlas/${path}`
}

/**
 * 출처를 확인한 공식 아이콘(2026-11-10). 출처는 docs/asset_cdn.md — 대부분 공식 아이템 사전
 * (lostark.game.onstove.com/ItemDictionary)의 아이템 상세 iconPath에서 가져왔다. 여기 있는 것은 전부
 * "정확히 그 아이템"의 아이콘이다(같은 계열 대표로 대신 쓰는 아이콘은 itemCatalog.json의 imageApprox).
 */
export const GAME_ICONS = {
  /** 골드 — 로츠고·클로아·공식 캘린더 API 모두 같은 아이콘 */
  gold: iconAtlas('money/money_4.png'),
  /** 귀속 골드 — 공식 캘린더 API의 "귀속 골드" 보상 아이콘 */
  boundGold: iconAtlas('money/money_16.png'),
  /** 실링 */
  silver: iconAtlas('etc/etc_14.png'),
  /** 운명의 편린 — 가디언·쿠르잔 전선의 "편린" 빠른 동작 */
  fateShard: iconAtlas('use/use_11_221.png'),
  /** 시련의 모래 — 쿠르잔 전선 대상이 혼돈의 균열 단계일 때의 빠른 동작 */
  trialSand: iconAtlas('use/use_14_9.png'),
  /** 입장권 : 에브니 큐브[제 N 해금] */
  ebonyCubeTicket: {
    unlock1: iconAtlas('use/use_12_193.png'),
    unlock2: iconAtlas('use/use_12_194.png'),
    unlock3: iconAtlas('use/use_12_195.png'),
    unlock4: iconAtlas('use/use_12_196.png'),
  } satisfies Record<TicketType, string>,
} as const
