// 로스트아크 공식 에셋 CDN(docs/asset_cdn.md). 게임 아이콘은 efui_iconatlas/{아틀라스}/{파일}.png 경로이며
// CORS가 열려 있어 그대로 불러 쓸 수 있다. 다른 서드파티의 미러(pica.korlark.com 등)는 쓰지 않는다.
export const LOSTARK_CDN_BASE = 'https://cdn-lostark.game.onstove.com'

function iconAtlas(path: string) {
  return `${LOSTARK_CDN_BASE}/efui_iconatlas/${path}`
}

/** 출처를 확인한 공식 아이콘(2026-11-10). 새 아이콘을 쓸 때는 docs/asset_cdn.md에 출처와 함께 적는다. */
export const GAME_ICONS = {
  /** 골드 — 로츠고·클로아·공식 캘린더 API 모두 같은 아이콘 */
  gold: iconAtlas('money/money_4.png'),
  /** 귀속 골드 — 공식 캘린더 API의 "귀속 골드" 보상 아이콘 */
  boundGold: iconAtlas('money/money_16.png'),
  /** 실링 */
  silver: iconAtlas('etc/etc_14.png'),
} as const
