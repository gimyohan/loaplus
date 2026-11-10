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
  /** 아이템 등급 — 일반/고급/희귀/영웅/전설/유물/고대/에스더 중 하나. 아이콘 배경색을 등급별로
   * 통일해 정하는 데 쓴다(lib/armoryColors.ts의 gradeBackground 참고). */
  grade: string
  /** 아이템 티어 표기(현재까지 확인된 값은 전부 "티어 4") 여부 — 참이면 아크 패시브 프레임을
   * 씌운다(components/character/armorySlots.tsx의 ItemFrames 참고). */
  isTierGear: boolean
  /** 0이면 없음, 지금까지 확인된 0이 아닌 값은 6(전율 세트)뿐 — 0이 아니면 전율 전용 프레임을
   * 씌운다. */
  petBorder: number
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
  /** 효과를 대표하는 색(등급) — 요약 점에 쓴다. */
  color: string
  /** 색이 있는 조각(수치)/없는 조각(color null)으로 나눈 문장 — 공식 툴팁처럼 수치만 색으로 보여주는 데
   * 쓴다. 이 필드가 생기기 전에 저장된 캐릭터는 새로고침 전까지 없다. */
  segments?: { text: string; color: string | null }[]
}

export interface AccessorySlotDetail {
  polishEffects: PolishEffect[]
  /** 아이템 아이콘 이미지 URL. EquipmentSlotDetail.iconUrl과 동일한 용도 — 상세 배너에서 lucide
   * 아이콘 대신 실제 장신구 이미지를 보여주는 데 쓴다. */
  iconUrl: string
  /** 아이템 등급. EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
  /** EquipmentSlotDetail.isTierGear와 동일한 용도(장신구는 아크 패시브 프레임 2번). */
  isTierGear: boolean
  /** EquipmentSlotDetail.petBorder와 동일한 용도(장신구는 지금까지 0이 아닌 값 확인된 적 없음). */
  petBorder: number
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
  /** 아이템 아이콘 이미지 URL. 어빌리티 스톤은 슬롯이 하나뿐이라 engravings와 달리 값 하나만 갖는다. */
  iconUrl: string
  /** 아이템 등급. EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
}

export interface BraceletDetail {
  effects: PolishEffect[]
  /** 아이템 아이콘 이미지 URL. */
  iconUrl: string
  /** 아이템 등급. EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
  /** EquipmentSlotDetail.isTierGear와 동일한 용도(팔찌는 아크 패시브 프레임 3번). */
  isTierGear: boolean
  /** EquipmentSlotDetail.petBorder와 동일한 용도(팔찌는 지금까지 0이 아닌 값 확인된 적 없음). */
  petBorder: number
}

/** 완갑(팔찌 다음에 추가된 장비 슬롯) — 팔찌와 달리 재련 단계가 있고, 효과 텍스트는 색상 정보가
 * 없어 PolishEffect가 아니라 문자열 배열이다(백엔드 armoryDetailParsing.ts의 WristGuardDetail
 * 주석 참고). 캐릭터에 따라 없을 수 있다(그 경우 모든 필드가 빈 기본값). */
export interface WristGuardDetail {
  /** 재련 접두사("+15 ")를 뗀 아이템 이름. EquipmentSlotDetail.itemName과 동일한 용도. */
  itemName: string
  refineLevel: number
  /** 아이템 아이콘 이미지 URL. */
  iconUrl: string
  effects: string[]
  /** 아이템 등급. EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
  /** 완갑은 아크 패시브 3분류 어디에도 안 속해 렌더링에는 안 쓴다(사용자 확인) — 데이터만 저장.
   * EquipmentSlotDetail.isTierGear와 동일한 값. */
  isTierGear: boolean
  /** EquipmentSlotDetail.petBorder와 동일한 용도 — 완갑에서 실제로 프레임을 붙이는 유일한 조건. */
  petBorder: number
}
