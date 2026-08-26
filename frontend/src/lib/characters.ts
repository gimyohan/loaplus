import { ApiError, apiFetch } from '@/lib/api'
import type { AbilityStoneDetail, AccessoryDetail, BraceletDetail, EquipmentDetail } from '@/types/armory'
import type { CharacterSibling, CharacterSummary } from '@/types/character'

// 한 유저가 등록할 수 있는 캐릭터 카드 최대 개수. 백엔드
// workspace/backend/src/routes/characters.ts의 MAX_CHARACTERS_PER_USER와 항상 같은 값으로
// 맞춰야 한다(FE/BE 양쪽에 동일한 상수를 두는 패턴 — raidCatalog.json 등과 동일).
export const MAX_CHARACTERS_PER_USER = 30

const CHARACTER_ERROR_MESSAGES: Record<string, string> = {
  lostark_key_required: '먼저 로스트아크 API 키를 등록해 주세요.',
  lostark_key_invalid: '등록된 로스트아크 API 키가 유효하지 않습니다.',
  lostark_api_rate_limited: '로스트아크 API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  character_not_found: '해당 이름의 캐릭터를 찾을 수 없습니다.',
  lostark_api_unavailable: '로스트아크 API에 접속할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  item_level_too_low: '아이템 레벨 1,640 미만인 캐릭터는 추가할 수 없습니다.',
  character_limit_reached: `캐릭터는 최대 ${MAX_CHARACTERS_PER_USER}개까지 등록할 수 있습니다.`,
}

/** 캐릭터 조회/등록 관련 ApiError를 사용자에게 보여줄 한글 메시지로 변환한다. */
export function describeCharacterApiError(err: unknown): string {
  if (err instanceof ApiError && err.code) {
    return CHARACTER_ERROR_MESSAGES[err.code] ?? '캐릭터 조회에 실패했습니다.'
  }
  return '캐릭터 조회에 실패했습니다.'
}

interface CharacterResponse {
  id: string
  serverName: string
  characterName: string
  itemLevel: number
  combatPower: number
  className: string
  imageUrl: string | null
  equipment: EquipmentDetail
  accessories: AccessoryDetail
  abilityStone: AbilityStoneDetail
  bracelet: BraceletDetail
}

function toCharacterSummary(dto: CharacterResponse): CharacterSummary {
  return {
    id: dto.id,
    server: dto.serverName,
    characterName: dto.characterName,
    job: dto.className,
    itemLevel: dto.itemLevel,
    combatPower: dto.combatPower,
    imageUrl: dto.imageUrl ?? undefined,
    equipment: dto.equipment,
    accessories: dto.accessories,
    abilityStone: dto.abilityStone,
    bracelet: dto.bracelet,
  }
}

export async function fetchCharacters(): Promise<CharacterSummary[]> {
  const data = await apiFetch<CharacterResponse[]>('/api/characters')
  return data.map(toCharacterSummary)
}

/** Open API에서 실존 여부를 확인하고 최초 데이터를 저장한다. 실패 시 ApiError를 던진다. */
export async function registerCharacter(characterName: string): Promise<CharacterSummary> {
  const data = await apiFetch<CharacterResponse>('/api/characters', {
    method: 'POST',
    body: JSON.stringify({ characterName }),
  })
  return toCharacterSummary(data)
}

export async function deleteCharacter(characterId: string): Promise<void> {
  await apiFetch<void>(`/api/characters/${characterId}`, { method: 'DELETE' })
}

/** Open API를 재호출해 저장된 캐릭터 정보를 최신화한다(배너 '새로고침' 버튼). */
export async function refreshCharacter(characterId: string): Promise<CharacterSummary> {
  const data = await apiFetch<CharacterResponse>(`/api/characters/${characterId}/refresh`, {
    method: 'POST',
  })
  return toCharacterSummary(data)
}

/** 입력한 캐릭터와 같은 원정대에 속한 모든 캐릭터 목록을 Open API에서 그대로 가져온다(미등록 포함). */
export async function fetchCharacterSiblings(characterName: string): Promise<CharacterSibling[]> {
  return apiFetch<CharacterSibling[]>(
    `/api/characters/lookup/${encodeURIComponent(characterName)}/siblings`,
  )
}
