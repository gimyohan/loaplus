import type { ArmoryDetail, RawArmoryEquipmentItem } from './armoryDetailParsing.js'
import { parseArmoryEquipmentDetail } from './armoryDetailParsing.js'

const LOSTARK_API_BASE_URL = 'https://developer-lostark.game.onstove.com'

export class LostarkApiError extends Error {
  constructor(
    message: string,
    public readonly kind: 'not_found' | 'rate_limited' | 'unauthorized' | 'unknown',
  ) {
    super(message)
  }
}

interface ArmoryProfile {
  CharacterImage: string | null
  ServerName: string
  CharacterName: string
  CharacterClassName: string
  ItemAvgLevel: string
  // 일부 캐릭터는 Open API가 이 값을 null로 내려준다(예: 데모닉 클래스 캐릭터에서 실제 확인됨,
  // 원인 불명 — 전투력 계산이 안 된 상태로 추정). fetchCharacterBanner에서 0으로 취급한다.
  CombatPower: string | null
}

export interface CharacterBanner extends ArmoryDetail {
  imageUrl: string | null
  serverName: string
  characterName: string
  className: string
  itemLevel: number
  combatPower: number
}

interface CharacterInfo {
  ServerName: string
  CharacterName: string
  CharacterLevel: number
  CharacterClassName: string
  ItemAvgLevel: string
}

export interface CharacterSibling {
  serverName: string
  characterName: string
  characterLevel: number
  className: string
  itemLevel: number
}

/** Open API의 콤마 포맷 숫자 문자열("1,662.50")을 숫자로 변환한다. null이면(일부 캐릭터의
 * CombatPower가 실제로 null로 내려오는 사례 확인됨) 0으로 취급한다 — 값이 없다고 등록/새로고침
 * 자체를 실패시키지 않는다. */
function parseCommaNumber(value: string | null): number {
  if (value === null) return 0
  return Number.parseFloat(value.replace(/,/g, ''))
}

export async function fetchCharacterBanner(
  characterName: string,
  apiKey: string,
): Promise<CharacterBanner> {
  const response = await fetch(
    `${LOSTARK_API_BASE_URL}/armories/characters/${encodeURIComponent(characterName)}`,
    { headers: { Authorization: `bearer ${apiKey}` } },
  )

  if (response.status === 404) {
    throw new LostarkApiError('Character not found', 'not_found')
  }
  if (response.status === 401) {
    throw new LostarkApiError('Invalid Lost Ark API key', 'unauthorized')
  }
  if (response.status === 429) {
    throw new LostarkApiError('Lost Ark API rate limit exceeded', 'rate_limited')
  }
  if (!response.ok) {
    throw new LostarkApiError(`Lost Ark API request failed: ${response.status}`, 'unknown')
  }

  // 존재하지 않는 캐릭터명이면 404가 아니라 200 + body `null`을 응답하는 것이 Open API의 실제 동작이다.
  const body = (await response.json()) as {
    ArmoryProfile: ArmoryProfile | null
    ArmoryEquipment: RawArmoryEquipmentItem[] | null
  } | null
  if (!body?.ArmoryProfile) {
    throw new LostarkApiError('Character not found', 'not_found')
  }

  const profile = body.ArmoryProfile
  // 상세 배너용 4개 필드(docs/db_schema.typ의 Characters "상세 배너용 컬럼" 참고)는 같은 응답의
  // ArmoryEquipment를 파싱해 얻는다 — 별도 Open API 호출이 들지 않는다.
  const armoryDetail = parseArmoryEquipmentDetail(body.ArmoryEquipment)

  return {
    imageUrl: profile.CharacterImage,
    serverName: profile.ServerName,
    characterName: profile.CharacterName,
    className: profile.CharacterClassName,
    itemLevel: parseCommaNumber(profile.ItemAvgLevel),
    combatPower: parseCommaNumber(profile.CombatPower),
    ...armoryDetail,
  }
}

export async function fetchCharacterSiblings(
  characterName: string,
  apiKey: string,
): Promise<CharacterSibling[]> {
  const response = await fetch(
    `${LOSTARK_API_BASE_URL}/characters/${encodeURIComponent(characterName)}/siblings`,
    { headers: { Authorization: `bearer ${apiKey}` } },
  )

  if (response.status === 401) {
    throw new LostarkApiError('Invalid Lost Ark API key', 'unauthorized')
  }
  if (response.status === 429) {
    throw new LostarkApiError('Lost Ark API rate limit exceeded', 'rate_limited')
  }
  if (!response.ok) {
    throw new LostarkApiError(`Lost Ark API request failed: ${response.status}`, 'unknown')
  }

  // 존재하지 않는 캐릭터명이면(armory 엔드포인트와 달리 404도, null도 아니라) 빈 배열을 응답한다.
  // 실존하는 캐릭터는 항상 자기 자신을 포함해 최소 1개 이상의 원정대 캐릭터를 갖는다.
  const body = (await response.json()) as CharacterInfo[] | null
  if (!body || body.length === 0) {
    throw new LostarkApiError('Character not found', 'not_found')
  }

  return body.map((info) => ({
    serverName: info.ServerName,
    characterName: info.CharacterName,
    characterLevel: info.CharacterLevel,
    className: info.CharacterClassName,
    itemLevel: parseCommaNumber(info.ItemAvgLevel),
  }))
}
