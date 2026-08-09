import type { CharacterSummary } from '@/types/character'
import type { GuardianSummary } from '@/types/guardian'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'
import { mockCharacter } from '@/mocks/character'
import { mockGuardian } from '@/mocks/guardian'
import { mockKurzanFrontline } from '@/mocks/kurzanFrontline'

export interface CharacterDefaultValueRecord {
  character: CharacterSummary
  guardian: GuardianSummary
  kurzanFrontline: KurzanFrontlineSummary
}

// 캐릭터 이름 → Default Value 데이터. 백엔드 연동 후에는 이 이름으로 GET 요청 한 번을 보내는
// 형태가 될 것이므로(docs/db_schema.typ: Characters/Character_Contents 테이블), 지금은 그 응답을
// 흉내낸 몇 개의 예시 캐릭터만 미리 채워두고 조회한다. 서버가 없을 뿐 "없는 이름을 치면 새로
// 만들어준다"는 동작은 실제 GET과 다르므로 여기서는 하지 않는다 — 목록에 없는 이름은 그냥 조회
// 실패(undefined)로 취급한다.
const registry = new Map<string, CharacterDefaultValueRecord>([
  [
    mockCharacter.characterName,
    { character: mockCharacter, guardian: mockGuardian, kurzanFrontline: mockKurzanFrontline },
  ],
  [
    '번개waffle',
    {
      character: {
        server: '루페온',
        characterName: '번개waffle',
        job: '홀리나이트',
        itemLevel: 1580,
        combatPower: 620.12,
      },
      guardian: {
        targetName: '베히모스',
        restGauge: 75,
        restGaugeMax: 100,
        isHarvested: false,
      },
      kurzanFrontline: {
        targetName: '네프타 작전 2',
        restGauge: 120,
        restGaugeMax: 200,
        restGaugeThreshold: 40,
        isHarvested: false,
        restGaugeConsumedByHarvest: false,
      },
    },
  ],
])

/**
 * 캐릭터 이름으로 Default Value 데이터를 조회한다(GET 흉내). 등록되지 않은 이름이면
 * undefined를 반환하며, 이 경우 호출부는 Default Value 위젯을 노출하지 않아야 한다.
 */
export function getMockCharacterRecord(rawName: string): CharacterDefaultValueRecord | undefined {
  const characterName = rawName.trim()
  if (!characterName) return undefined
  return registry.get(characterName)
}

export function updateMockGuardian(characterName: string, guardian: GuardianSummary) {
  const record = getMockCharacterRecord(characterName)
  if (record) record.guardian = guardian
}

export function updateMockKurzanFrontline(characterName: string, kurzanFrontline: KurzanFrontlineSummary) {
  const record = getMockCharacterRecord(characterName)
  if (record) record.kurzanFrontline = kurzanFrontline
}
