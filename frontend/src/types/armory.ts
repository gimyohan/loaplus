// 상세 배너(BANNER_DETAILED, 10x4) 전용 데이터. workspace/backend/src/lib/armoryDetailParsing.ts의
// 타입과 1:1 대응한다(docs/api.typ "상세 배너 필드 매핑" 참고).
export interface EquipmentSlotDetail {
  refineLevel: number
  advancedRefineLevel: number
  quality: number
  /** 재련 접두사("+13 ")를 뗀 아이템 이름(예: "운명의 업화 상의"). 강화 단계 색 구간을 세트
   * 이름으로 구분하는 데 쓴다(lib/armoryColors.ts 참고). */
  itemName: string
  /** 아이템 아이콘 이미지 URL. 상세 배너에서 직업 아이콘 대신 실제 장비 이미지를 보여주는 데 쓴다. */
  iconUrl: string
}

export interface EquipmentDetail {
  weapon: EquipmentSlotDetail
  head: EquipmentSlotDetail
  chest: EquipmentSlotDetail
  pants: EquipmentSlotDetail
  gloves: EquipmentSlotDetail
  shoulder: EquipmentSlotDetail
}

/** `<FONT COLOR='RRGGBB'>` 태그에서 그대로 뽑아낸 색상(`#RRGGBB`) — 백엔드가 파싱한 실제 게임 색상이다. */
export interface PolishEffect {
  text: string
  color: string
}

export interface AccessorySlotDetail {
  polishEffects: PolishEffect[]
}

export interface AccessoryDetail {
  necklace: AccessorySlotDetail
  earring1: AccessorySlotDetail
  earring2: AccessorySlotDetail
  ring1: AccessorySlotDetail
  ring2: AccessorySlotDetail
}

export interface AbilityStoneEngraving {
  name: string
  level: number
}

export interface AbilityStoneDetail {
  engravings: AbilityStoneEngraving[]
}

export interface BraceletDetail {
  effects: PolishEffect[]
}
