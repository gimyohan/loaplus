// docs/api.typ "상세 배너 필드 매핑" 참고. Open API GET /armories/characters/{characterName}
// 응답의 ArmoryEquipment 배열을 파싱해 docs/db_schema.typ의 Characters 상세 배너용 컬럼
// (equipment/accessories/ability_stone/bracelet) 형태로 변환한다. Tooltip 필드는 문서화되지
// 않은 내부 UI 렌더링용 JSON 문자열이라, 실제 응답을 까본 결과를 바탕으로 정규식/구조 탐색으로
// 필요한 값만 뽑아낸다 — Tooltip 원문 자체는 저장하지 않는다.

export interface RawArmoryEquipmentItem {
  Type: string
  Name: string
  Icon: string
  Grade: string
  Tooltip: string
}

interface TooltipElement {
  type: string
  value: unknown
}

type Tooltip = Record<string, TooltipElement | null>

export interface EquipmentSlotDetail {
  refineLevel: number
  advancedRefineLevel: number
  quality: number
  /** 재련 접두사("+13 ")를 뗀 아이템 이름(예: "운명의 업화 상의"). 강화 단계 색 구간을 세트
   * 이름으로 구분하기 위해 저장한다(workspace/frontend/src/lib/armoryColors.ts 참고) — 세트마다
   * 같은 강화 단계라도 대응하는 아이템 레벨 폭이 달라, 이름 없이는 구간을 나눌 수 없다. */
  itemName: string
  /** 아이템 아이콘 이미지 URL(ArmoryEquipment[].Icon 그대로). 상세 배너에서 직업별 lucide
   * 아이콘 대신 실제 장비 이미지를 보여주는 데 쓴다. */
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

export interface ArmoryDetail {
  equipment: EquipmentDetail
  accessories: AccessoryDetail
  abilityStone: AbilityStoneDetail
  bracelet: BraceletDetail
}

const EMPTY_EQUIPMENT_SLOT: EquipmentSlotDetail = {
  refineLevel: 0,
  advancedRefineLevel: 0,
  quality: 0,
  itemName: '',
  iconUrl: '',
}
const EMPTY_ACCESSORY_SLOT: AccessorySlotDetail = { polishEffects: [] }

const EQUIPMENT_SLOT_BY_TYPE: Record<string, keyof EquipmentDetail> = {
  무기: 'weapon',
  투구: 'head',
  상의: 'chest',
  하의: 'pants',
  장갑: 'gloves',
  어깨: 'shoulder',
}

// 어빌리티 스톤 "무작위 각인 효과"에서 디버프 각인(적에게 적용)은 항상 이 색으로 표시된다 —
// 전투 각인(자신에게 적용) 2개만 관리하고 이 색인 항목은 건너뛴다(docs/api.typ 참고).
const ABILITY_STONE_DEBUFF_NAME_COLOR = '#FE2E2E'

function emptyEquipmentDetail(): EquipmentDetail {
  return {
    weapon: { ...EMPTY_EQUIPMENT_SLOT },
    head: { ...EMPTY_EQUIPMENT_SLOT },
    chest: { ...EMPTY_EQUIPMENT_SLOT },
    pants: { ...EMPTY_EQUIPMENT_SLOT },
    gloves: { ...EMPTY_EQUIPMENT_SLOT },
    shoulder: { ...EMPTY_EQUIPMENT_SLOT },
  }
}

function emptyAccessoryDetail(): AccessoryDetail {
  return {
    necklace: { ...EMPTY_ACCESSORY_SLOT },
    earring1: { ...EMPTY_ACCESSORY_SLOT },
    earring2: { ...EMPTY_ACCESSORY_SLOT },
    ring1: { ...EMPTY_ACCESSORY_SLOT },
    ring2: { ...EMPTY_ACCESSORY_SLOT },
  }
}

function tooltipElements(tooltip: Tooltip): TooltipElement[] {
  return Object.values(tooltip).filter((element): element is TooltipElement => element != null)
}

/** ItemPartBox 중 라벨(Element_000)에 labelSubstring이 포함된 것을 찾아 본문(Element_001)을 반환한다. */
function findItemPartBoxText(tooltip: Tooltip, labelSubstring: string): string | null {
  for (const element of tooltipElements(tooltip)) {
    if (element.type !== 'ItemPartBox') continue
    const value = element.value as { Element_000?: unknown; Element_001?: unknown }
    if (typeof value.Element_000 === 'string' && value.Element_000.includes(labelSubstring)) {
      return typeof value.Element_001 === 'string' ? value.Element_001 : null
    }
  }
  return null
}

/**
 * `<img .../>효과 텍스트 <FONT color='RRGGBB'>+값</FONT>` 형식의 줄이 `<br>`로 이어진 문자열을
 * { text, color } 목록으로 변환한다. 장신구 "연마 효과"와 팔찌 "팔찌 효과"가 같은 형식을 쓴다.
 */
function parseEffectLines(html: string): PolishEffect[] {
  const effects: PolishEffect[] = []
  for (const rawSegment of html.split(/<br>/i)) {
    const segment = rawSegment.replace(/<img[^>]*>(?:<\/img>)?/gi, '').trim()
    const match = segment.match(/^(.*?)<FONT\s+COLOR=['"]#?([0-9A-Fa-f]{6})['"]>([^<]*)<\/FONT>$/i)
    if (!match) continue
    const [, prefix, color, value] = match
    effects.push({ text: `${prefix}${value}`.trim(), color: `#${color.toUpperCase()}` })
  }
  return effects
}

function parseEquipmentSlot(name: string, iconUrl: string, tooltip: Tooltip): EquipmentSlotDetail {
  // 이름 앞 "+13 " 접두사에서 재련 단계를 얻는다. 접두사가 없으면(미재련) 0단계다.
  const refineMatch = name.match(/^\+(\d+)\s/)
  const refineLevel = refineMatch ? Number.parseInt(refineMatch[1], 10) : 0
  // 접두사를 뗀 나머지가 세트 구분에 쓰는 아이템 이름이다(예: "운명의 업화 상의").
  const itemName = refineMatch ? name.slice(refineMatch[0].length) : name

  let advancedRefineLevel = 0
  let quality = 0
  for (const element of tooltipElements(tooltip)) {
    if (element.type === 'ItemTitle') {
      const value = element.value as { qualityValue?: number }
      if (typeof value.qualityValue === 'number' && value.qualityValue >= 0) {
        quality = value.qualityValue
      }
    }
    if (element.type === 'SingleTextBox' && typeof element.value === 'string' && element.value.includes('상급 재련')) {
      // "[상급 재련] <FONT ...>10</FONT>단계" 형식 — 숫자와 "단계" 사이에 닫는 </FONT> 태그가
      // 끼어 있어 그 태그를 경계로 잡아야 한다. 아직 상급 재련을 한 번도 안 했으면 이 요소 자체가
      // 없어 0단계.
      const match = element.value.match(/상급 재련[\s\S]*?(\d+)<\/FONT>\s*단계/i)
      if (match) advancedRefineLevel = Number.parseInt(match[1], 10)
    }
  }
  return { refineLevel, advancedRefineLevel, quality, itemName, iconUrl }
}

function parseAbilityStoneEngravings(tooltip: Tooltip): AbilityStoneEngraving[] {
  for (const element of tooltipElements(tooltip)) {
    if (element.type !== 'IndentStringGroup') continue
    const value = element.value as { Element_000?: { contentStr?: Record<string, { contentStr?: string }> } }
    const entries = value.Element_000?.contentStr
    if (!entries) continue

    const engravings: AbilityStoneEngraving[] = []
    for (const entry of Object.values(entries)) {
      const raw = entry?.contentStr
      if (!raw) continue
      // "[<FONT COLOR='#FFFFAC'>예리한 둔기</FONT>] ...Lv.2" 형식.
      const nameMatch = raw.match(/\[<FONT COLOR='#?([0-9A-Fa-f]{6})'>([^<]+)<\/FONT>\]/i)
      const levelMatch = raw.match(/Lv\.(\d+)/)
      if (!nameMatch || !levelMatch) continue
      const color = `#${nameMatch[1].toUpperCase()}`
      if (color === ABILITY_STONE_DEBUFF_NAME_COLOR) continue
      engravings.push({ name: nameMatch[2], level: Number.parseInt(levelMatch[1], 10) })
    }
    // 전투 각인은 항상 2개다(디버프 각인 1개는 위에서 이미 걸러짐) — 방어적으로 상한만 둔다.
    return engravings.slice(0, 2)
  }
  return []
}

/**
 * Open API 응답의 ArmoryEquipment 배열 하나를 파싱해 상세 배너 4개 컬럼(equipment/accessories/
 * ability_stone/bracelet) 형태로 변환한다. 슬롯이 비어 있으면(미착용) 해당 슬롯은 빈 기본값을
 * 그대로 둔다 — 저레벨 갓 등록한 캐릭터도 실패 없이 등록/새로고침되어야 하기 때문이다.
 * 귀걸이/반지처럼 같은 Type이 2개씩 나오는 슬롯은 응답에 등장하는 순서 그대로 1번/2번을 배정한다
 * (Open API가 좌우를 구분하는 필드를 따로 주지 않음).
 */
export function parseArmoryEquipmentDetail(items: RawArmoryEquipmentItem[] | null | undefined): ArmoryDetail {
  const equipment = emptyEquipmentDetail()
  const accessories = emptyAccessoryDetail()
  const abilityStone: AbilityStoneDetail = { engravings: [] }
  const bracelet: BraceletDetail = { effects: [] }

  let earringCount = 0
  let ringCount = 0

  for (const item of items ?? []) {
    let tooltip: Tooltip
    try {
      tooltip = JSON.parse(item.Tooltip) as Tooltip
    } catch {
      continue
    }

    const equipmentSlot = EQUIPMENT_SLOT_BY_TYPE[item.Type]
    if (equipmentSlot) {
      equipment[equipmentSlot] = parseEquipmentSlot(item.Name, item.Icon, tooltip)
      continue
    }

    switch (item.Type) {
      case '목걸이':
        accessories.necklace = { polishEffects: parseEffectLines(findItemPartBoxText(tooltip, '연마 효과') ?? '') }
        break
      case '귀걸이': {
        const detail = { polishEffects: parseEffectLines(findItemPartBoxText(tooltip, '연마 효과') ?? '') }
        if (earringCount === 0) accessories.earring1 = detail
        else if (earringCount === 1) accessories.earring2 = detail
        earringCount += 1
        break
      }
      case '반지': {
        const detail = { polishEffects: parseEffectLines(findItemPartBoxText(tooltip, '연마 효과') ?? '') }
        if (ringCount === 0) accessories.ring1 = detail
        else if (ringCount === 1) accessories.ring2 = detail
        ringCount += 1
        break
      }
      case '어빌리티 스톤':
        abilityStone.engravings = parseAbilityStoneEngravings(tooltip)
        break
      case '팔찌':
        bracelet.effects = parseEffectLines(findItemPartBoxText(tooltip, '팔찌 효과') ?? '')
        break
      default:
        break
    }
  }

  return { equipment, accessories, abilityStone, bracelet }
}
