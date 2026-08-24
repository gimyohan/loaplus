// docs/api.typ "거래소 시세" 섹션 참고. 전 유저 공용 캐시 데이터라 캐릭터/유저에 종속되지 않는다.
export interface MarketItemPrice {
  itemId: number
  itemName: string
  currentMinPrice: number
  updatedAt: string
}

export interface MarketItemDailyStat {
  date: string
  avgPrice: number
  tradeCount: number
}
