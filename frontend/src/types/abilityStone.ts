// docs/ability_stone.typ / docs/api.typ "어빌리티 스톤 세공 전략" 참고.
export type AbilityStoneSlot = 'MAJOR' | 'MINOR' | 'DEBUFF'

/** GET /api/ability-stone/strategy 응답 원소 하나 — 목표 등급 조합(주각인/부각인/디버프) 하나에
 * 대한 달성 확률과, 그 확률을 얻으려면 지금 어느 슬롯에 세공해야 하는지. bestAction이 null이면
 * 이 조합에 한해서는 더 세공할 게 없는 종결 상태다. */
export interface AbilityStoneOutcome {
  /** 0~4 등급 인덱스 (원시 성공 횟수 0~5/6/7~8/9/10 구간) */
  majorLevel: number
  minorLevel: number
  /** 0~3 등급 인덱스 (디버프는 0~4/5~6/7~9/10 구간) */
  debuffLevel: number
  probability: number
  bestAction: AbilityStoneSlot | null
}

/** 세공 상태를 이루는 7개 원시 값(docs/ability_stone.typ "상태 벡터" 참고). API 쿼리 파라미터와
 * 이름이 그대로 대응한다. */
export interface AbilityStoneState {
  majorFailCnt: number
  minorFailCnt: number
  debuffSuccCnt: number
  majorRemCnt: number
  minorRemCnt: number
  debuffRemCnt: number
  currProbabilityIdx: number
}
