// 상세 배너(BANNER_DETAILED, 10x4) 전용 데이터. workspace/backend/src/lib/armoryDetailParsing.ts의
// 타입과 1:1 대응한다(docs/api.typ "상세 배너 필드 매핑" 참고).
export interface EquipmentSlotDetail {
  refineLevel: number
  advancedRefineLevel: number
  quality: number
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
