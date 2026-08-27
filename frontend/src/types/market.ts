// docs/api.typ "거래소 시세" 섹션 참고. 전 유저 공용 캐시 데이터라 캐릭터/유저에 종속되지 않는다.
// Market 탭은 Market_Item_Daily_Stats(일별 시세 통계)만 참조한다(사용자 확정) — 실시간 현재
// 최소 판매가(Market_Item_Current_Prices)는 쓰지 않으므로 이 파일에 그 쪽 타입은 두지 않는다.
export interface MarketItemDailyStat {
  date: string
  itemName: string
  avgPrice: number
  tradeCount: number
}

/** GET /api/market/items?search= 검색 결과 한 건 — 매칭된 이름의 아이템 중 가장 최근 날짜의
 * 일별 통계 한 행. */
export interface MarketItemSearchResult {
  itemId: number
  itemName: string
  avgPrice: number
  date: string
}
