import type { CharacterSummary } from '@/types/character'

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
}