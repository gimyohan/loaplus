import type { AbilityStoneDetail, AccessoryDetail, BraceletDetail, EquipmentDetail, WristGuardDetail } from '@/types/armory'

// docs/widgets.typ - 배너(Banner) 위젯 표시 정보: 캐릭터 이미지, 서버 이름, 캐릭터 이름, 아이템 레벨, 전투력 레벨
export interface CharacterSummary {
  /** 백엔드 Characters.id. API 연동 전 목업 데이터는 고정 문자열을 사용한다. */
  id: string
  imageUrl?: string
  server: string
  characterName: string
  job: string
  itemLevel: number
  combatPower: number
  /** 상세 배너(BANNER_DETAILED, 10x4) 전용 필드 — banner/bannerCompact는 쓰지 않는다(docs/widgets.typ 참고). */
  equipment: EquipmentDetail
  accessories: AccessoryDetail
  abilityStone: AbilityStoneDetail
  bracelet: BraceletDetail
  wristGuard: WristGuardDetail
}

/** 원정대 일괄 조회(GET /api/characters/lookup/{characterName}/siblings) 결과 항목.
 * 아직 등록 전이라 id/imageUrl/combatPower가 없다 — Open API CharacterInfo를 그대로 반영한다. */
export interface CharacterSibling {
  serverName: string
  characterName: string
  characterLevel: number
  className: string
  itemLevel: number
}
