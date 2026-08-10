// docs/widgets.typ - 카오스 던전 / 쿠르잔 전선 / 혼돈의 균열 단계별 입장 최소 레벨 및 보상 참조 데이터.
// 세 컨텐츠 모두 최고 단계만 진행하므로(낮은 단계를 일부러 고르는 경우는 없음), 캐릭터의
// 아이템 레벨과 minItemLevel을 비교해 자동으로 최고 단계를 고르는 용도로 쓴다.
export interface ContentStageReward {
  // TODO: 보상 모달을 구현할 때 실제 보상 아이템/수량 스키마를 채운다.
  name: string
  quantity: number
}

export interface ContentStage {
  name: string
  /** 입장 최소 아이템 레벨 */
  minItemLevel: number
  /** 편린 / 아제나 축복 보상은 단계마다 달라지므로 단계별로 보관한다 */
  rewards: {
    shard: ContentStageReward[]
    azenaBlessing: ContentStageReward[]
  }
}

export interface ContentCategory {
  label: string
  stages: ContentStage[]
}

export type ContentCategoryKey = 'chaosDungeon' | 'kurzanFrontline' | 'chaosRift'

export type ContentStageCatalog = Record<ContentCategoryKey, ContentCategory>
