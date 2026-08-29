// docs/api.typ "상세 배너 필드 매핑" 참고. Open API GET /armories/characters/{characterName}
// 응답의 ArmoryEquipment 배열을 파싱해 docs/db_schema.typ의 Characters 상세 배너용 컬럼
// (equipment/accessories/ability_stone/bracelet/wrist_guard) 형태로 변환한다. Tooltip 필드는
// 문서화되지 않은 내부 UI 렌더링용 JSON 문자열이라, 실제 응답을 까본 결과를 바탕으로 정규식/구조
// 탐색으로 필요한 값만 뽑아낸다 — Tooltip 원문 자체는 저장하지 않는다.

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
  /** 아이템 등급(ArmoryEquipment[].Grade 그대로) — 일반/고급/희귀/영웅/전설/유물/고대/에스더 중
   * 하나. 아이콘 배경색을 등급별로 통일해 정하는 데 쓴다(workspace/frontend/src/lib/armoryColors.ts
   * 참고) — 예전에는 세트 이름(itemName)으로 장비만 따로 배경색을 정했는데, 등급 하나로 장비/
   * 장신구/어빌리티 스톤/팔찌/완갑 전부를 통일했다. */
  grade: string
  /** Tooltip.ItemTitle.leftStr2에 "티어" 표기가 있는지(현재 확인된 값은 전부 "티어 4") — 참이면
   * 아크 패시브 프레임(bg_equipment_arkpassive*.png)을 씌운다. "4"로 고정하지 않고 "티어"
   * 포함 여부만 보는 이유는, 나중에 티어 5가 나와도 코드를 안 고치고 그대로 동작하게 하기
   * 위함이다(workspace/frontend/src/lib/armoryColors.ts 참고). */
  isTierGear: boolean
  /** Tooltip.ItemTitle.slotData.petBorder 그대로 — 0이면 없음, 지금까지 확인된 0이 아닌 값은
   * 6(전율 세트)뿐이다. 0이 아니면 전율 전용 프레임(bg_equipment_petBorder.png)을 씌운다. */
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

export interface PolishEffect {
  text: string
  color: string
}

export interface AccessorySlotDetail {
  polishEffects: PolishEffect[]
  /** 아이템 아이콘 이미지 URL(ArmoryEquipment[].Icon 그대로). EquipmentSlotDetail.iconUrl과 동일한
   * 용도 — 상세 배너에서 lucide 아이콘 대신 실제 장신구 이미지를 보여주는 데 쓴다. */
  iconUrl: string
  /** 아이템 등급(ArmoryEquipment[].Grade 그대로). EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
  /** EquipmentSlotDetail.isTierGear와 동일한 용도 — 참이면 아크 패시브 프레임(장신구는
   * bg_equipment_arkpassive2.png)을 씌운다. */
  isTierGear: boolean
  /** EquipmentSlotDetail.petBorder와 동일한 용도. 장신구는 지금까지 0이 아닌 값이 확인된 적
   * 없지만("전율 목걸이" 같은 아이템 자체가 없음), 다른 슬롯과 같은 구조를 유지하려고 둔다. */
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
  /** 아이템 아이콘 이미지 URL(ArmoryEquipment[].Icon 그대로). 어빌리티 스톤은 슬롯이 하나뿐이라
   * engravings와 달리 값 하나만 갖는다. */
  iconUrl: string
  /** 아이템 등급(ArmoryEquipment[].Grade 그대로). EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
}

export interface BraceletDetail {
  effects: PolishEffect[]
  /** 아이템 아이콘 이미지 URL(ArmoryEquipment[].Icon 그대로). */
  iconUrl: string
  /** 아이템 등급(ArmoryEquipment[].Grade 그대로). EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
  /** EquipmentSlotDetail.isTierGear와 동일한 용도 — 참이면 아크 패시브 프레임(팔찌는
   * bg_equipment_arkpassive3.png)을 씌운다. */
  isTierGear: boolean
  /** EquipmentSlotDetail.petBorder와 동일한 용도(팔찌는 지금까지 0이 아닌 값 확인된 적 없음). */
  petBorder: number
}

// 완갑(팔찌보다 나중에 추가된 장비 슬롯)은 팔찌/장신구와 달리 재련 단계가 있고(이름 접두사
// "+15 " 형식, EquipmentSlotDetail과 동일), 그 대신 품질(quality)·상급 재련은 없다(Tooltip의
// ItemTitle.qualityValue가 항상 -1이고 "상급 재련" SingleTextBox 자체가 없음 — 실제 응답으로
// 확인함). 효과 텍스트도 장신구/팔찌의 "연마 효과"/"팔찌 효과"(줄마다 <FONT COLOR>로 색이 있는
// PolishEffect 형식)와 달리 "기본 효과"/"추가 효과" 두 ItemPartBox에 색 없는 일반 텍스트로만
// 나온다 — 그래서 PolishEffect가 아니라 문자열 배열로 둔다.
export interface WristGuardDetail {
  /** 재련 접두사("+15 ")를 뗀 아이템 이름. EquipmentSlotDetail.itemName과 동일한 용도. */
  itemName: string
  refineLevel: number
  /** 아이템 아이콘 이미지 URL(ArmoryEquipment[].Icon 그대로). */
  iconUrl: string
  /** "기본 효과" + "추가 효과" 텍스트를 순서대로 이어붙인 목록. 색상 정보는 없다. */
  effects: string[]
  /** 아이템 등급(ArmoryEquipment[].Grade 그대로). EquipmentSlotDetail.grade와 동일한 용도. */
  grade: string
  /** 완갑은 아크 패시브(진화/깨달음/도약) 3분류 어디에도 안 속해 티어 여부와 무관하게 아크
   * 패시브 프레임을 씌우지 않는다(사용자 확인) — 그래서 이 필드는 저장만 하고 렌더링에는 안
   * 쓴다. EquipmentSlotDetail.isTierGear와 동일한 값이다. */
  isTierGear: boolean
  /** EquipmentSlotDetail.petBorder와 동일한 용도 — 완갑은 "전율" 세트일 때만 0이 아니며(확인된
   * 값 6), 이때만 전율 전용 프레임을 씌운다. 완갑에서 실제로 프레임을 붙이는 유일한 조건이다. */
  petBorder: number
}

export interface ArmoryDetail {
  equipment: EquipmentDetail
  accessories: AccessoryDetail
  abilityStone: AbilityStoneDetail
  bracelet: BraceletDetail
  wristGuard: WristGuardDetail
}

const EMPTY_EQUIPMENT_SLOT: EquipmentSlotDetail = {
  refineLevel: 0,
  advancedRefineLevel: 0,
  quality: 0,
  itemName: '',
  iconUrl: '',
  grade: '',
  isTierGear: false,
  petBorder: 0,
}
const EMPTY_ACCESSORY_SLOT: AccessorySlotDetail = {
  polishEffects: [],
  iconUrl: '',
  grade: '',
  isTierGear: false,
  petBorder: 0,
}

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

/** ItemTitle 엘리먼트의 leftStr2(티어 표기)·slotData.petBorder를 뽑아 프레임 판정에 쓴다.
 * 장비/장신구/팔찌/완갑이 전부 같은 구조를 공유한다(실제 응답으로 확인함) — 어느 아이템 종류든
 * 이 함수 하나로 처리한다. */
function parseItemTitleFrame(tooltip: Tooltip): { isTierGear: boolean; petBorder: number } {
  for (const element of tooltipElements(tooltip)) {
    if (element.type !== 'ItemTitle') continue
    const value = element.value as { leftStr2?: string; slotData?: { petBorder?: number } }
    return {
      isTierGear: Boolean(value.leftStr2?.includes('티어')),
      petBorder: value.slotData?.petBorder ?? 0,
    }
  }
  return { isTierGear: false, petBorder: 0 }
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

function parseEquipmentSlot(name: string, iconUrl: string, grade: string, tooltip: Tooltip): EquipmentSlotDetail {
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
  return { refineLevel, advancedRefineLevel, quality, itemName, iconUrl, grade, ...parseItemTitleFrame(tooltip) }
}

/** `<br>`로 이어진 줄을 태그만 벗겨낸 일반 텍스트 목록으로 바꾼다. 완갑의 "기본 효과"/"추가
 * 효과"처럼 색상 태그 없이 그냥 텍스트만 나오는 형식에 쓴다(parseEffectLines와 달리 <FONT COLOR>
 * 매칭을 요구하지 않는다). */
function parsePlainEffectLines(html: string): string[] {
  return html
    .split(/<br>/i)
    .map((line) => line.replace(/<[^>]+>/g, '').trim())
    .filter((line) => line.length > 0)
}

function parseWristGuardSlot(name: string, iconUrl: string, grade: string, tooltip: Tooltip): WristGuardDetail {
  // 이름 접두사에서 재련 단계를 얻는 방식은 parseEquipmentSlot과 동일하다 — 완갑도 "+15 " 형식의
  // 접두사를 쓴다. 다만 품질/상급 재련 개념이 없어(위 WristGuardDetail 주석 참고) 그 부분은 뺐다.
  const refineMatch = name.match(/^\+(\d+)\s/)
  const refineLevel = refineMatch ? Number.parseInt(refineMatch[1], 10) : 0
  const itemName = refineMatch ? name.slice(refineMatch[0].length) : name

  const effects = [
    ...parsePlainEffectLines(findItemPartBoxText(tooltip, '기본 효과') ?? ''),
    ...parsePlainEffectLines(findItemPartBoxText(tooltip, '추가 효과') ?? ''),
  ]

  return { itemName, refineLevel, iconUrl, effects, grade, ...parseItemTitleFrame(tooltip) }
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
 * Open API 응답의 ArmoryEquipment 배열 하나를 파싱해 상세 배너 5개 컬럼(equipment/accessories/
 * ability_stone/bracelet/wrist_guard) 형태로 변환한다. 슬롯이 비어 있으면(미착용) 해당 슬롯은 빈 기본값을
 * 그대로 둔다 — 저레벨 갓 등록한 캐릭터도 실패 없이 등록/새로고침되어야 하기 때문이다.
 * 귀걸이/반지처럼 같은 Type이 2개씩 나오는 슬롯은 응답에 등장하는 순서 그대로 1번/2번을 배정한다
 * (Open API가 좌우를 구분하는 필드를 따로 주지 않음).
 */
export function parseArmoryEquipmentDetail(items: RawArmoryEquipmentItem[] | null | undefined): ArmoryDetail {
  const equipment = emptyEquipmentDetail()
  const accessories = emptyAccessoryDetail()
  const abilityStone: AbilityStoneDetail = { engravings: [], iconUrl: '', grade: '' }
  const bracelet: BraceletDetail = { effects: [], iconUrl: '', grade: '', isTierGear: false, petBorder: 0 }
  let wristGuard: WristGuardDetail = {
    itemName: '',
    refineLevel: 0,
    iconUrl: '',
    effects: [],
    grade: '',
    isTierGear: false,
    petBorder: 0,
  }

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
      equipment[equipmentSlot] = parseEquipmentSlot(item.Name, item.Icon, item.Grade, tooltip)
      continue
    }

    switch (item.Type) {
      case '목걸이':
        accessories.necklace = {
          polishEffects: parseEffectLines(findItemPartBoxText(tooltip, '연마 효과') ?? ''),
          iconUrl: item.Icon,
          grade: item.Grade,
          ...parseItemTitleFrame(tooltip),
        }
        break
      case '귀걸이': {
        const detail = {
          polishEffects: parseEffectLines(findItemPartBoxText(tooltip, '연마 효과') ?? ''),
          iconUrl: item.Icon,
          grade: item.Grade,
          ...parseItemTitleFrame(tooltip),
        }
        if (earringCount === 0) accessories.earring1 = detail
        else if (earringCount === 1) accessories.earring2 = detail
        earringCount += 1
        break
      }
      case '반지': {
        const detail = {
          polishEffects: parseEffectLines(findItemPartBoxText(tooltip, '연마 효과') ?? ''),
          iconUrl: item.Icon,
          grade: item.Grade,
          ...parseItemTitleFrame(tooltip),
        }
        if (ringCount === 0) accessories.ring1 = detail
        else if (ringCount === 1) accessories.ring2 = detail
        ringCount += 1
        break
      }
      case '어빌리티 스톤':
        abilityStone.engravings = parseAbilityStoneEngravings(tooltip)
        abilityStone.iconUrl = item.Icon
        abilityStone.grade = item.Grade
        break
      case '팔찌':
        bracelet.effects = parseEffectLines(findItemPartBoxText(tooltip, '팔찌 효과') ?? '')
        bracelet.iconUrl = item.Icon
        bracelet.grade = item.Grade
        Object.assign(bracelet, parseItemTitleFrame(tooltip))
        break
      case '완갑':
        wristGuard = parseWristGuardSlot(item.Name, item.Icon, item.Grade, tooltip)
        break
      default:
        break
    }
  }

  return { equipment, accessories, abilityStone, bracelet, wristGuard }
}
