export interface RaidGateState {
  cleared: boolean
  moreRewardEnabled: boolean
}

export interface RaidTargetSummary {
  /** 목표를 아직 고르지 않은 빈 슬롯이면 둘 다 null이고 gates는 항상 빈 배열이다. */
  raidKey: string | null
  difficultyKey: string | null
  gates: RaidGateState[]
  /** 골드 획득 허용/거부. false면 관문을 완료해도 통계에 반영되지 않는다(docs/db_schema.typ 참고). */
  goldRewardEnabled: boolean
}
