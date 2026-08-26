import type { AbilityStoneDetail, AccessoryDetail, BraceletDetail, EquipmentDetail } from '@/types/armory'
import type { CharacterSummary } from '@/types/character'

const mockEquipmentSlot = {
  refineLevel: 15,
  advancedRefineLevel: 5,
  quality: 82,
  itemName: '운명의 업화 방어구',
  iconUrl: '',
}
const mockEquipment: EquipmentDetail = {
  weapon: { refineLevel: 17, advancedRefineLevel: 8, quality: 95, itemName: '운명의 업화 무기', iconUrl: '' },
  head: mockEquipmentSlot,
  chest: mockEquipmentSlot,
  pants: mockEquipmentSlot,
  gloves: mockEquipmentSlot,
  shoulder: mockEquipmentSlot,
}

const mockPolishEffects = [
  { text: '치명타 적중률 +1.55%', color: '#99DFFF' },
  { text: '무기 공격력 +1.60%', color: '#99DFFF' },
  { text: '깨달음 +6', color: '#F9CF56' },
]
const mockAccessorySlot = { polishEffects: mockPolishEffects }
const mockAccessories: AccessoryDetail = {
  necklace: mockAccessorySlot,
  earring1: mockAccessorySlot,
  earring2: mockAccessorySlot,
  ring1: mockAccessorySlot,
  ring2: mockAccessorySlot,
}

const mockAbilityStone: AbilityStoneDetail = {
  engravings: [
    { name: '예리한 둔기', level: 3 },
    { name: '결투의 대가', level: 2 },
  ],
}

const mockBracelet: BraceletDetail = {
  effects: [
    { text: '특화 +80', color: '#99DFFF' },
    { text: '치명 +80', color: '#99DFFF' },
    { text: '공격력 +2.00%', color: '#F9CF56' },
  ],
}

// 백엔드/Open API 연동 전까지 사용하는 로컬 목업 데이터.
// 실제 로스트아크 Open API 응답(GET /armories/characters/{name})에서
// CharacterSummary에 필요한 필드만 추출한 값이다. (docs/api.typ, docs/db_schema.typ 참고)
// imageUrl <- CharacterImage / server <- ServerName / characterName <- CharacterName
// job <- CharacterClassName / itemLevel <- ItemAvgLevel / combatPower <- CombatPower
export const mockCharacter: CharacterSummary = {
  id: 'mock-주먹밥괴물냥차차차',
  imageUrl:
    'https://img.lostark.co.kr/armory/4/6B99C805DCFAF98B70983122E305811AD82FEDE47F2F563FA158E7DBA7B69E8D.jpg?v=20260806062119',
  server: '카단',
  characterName: '주먹밥괴물냥차차차',
  job: '리퍼',
  itemLevel: 1662.5,
  combatPower: 838.59,
  equipment: mockEquipment,
  accessories: mockAccessories,
  abilityStone: mockAbilityStone,
  bracelet: mockBracelet,
}