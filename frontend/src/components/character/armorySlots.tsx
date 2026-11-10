import { useState, type ReactNode } from 'react'

import { gradeBackground } from '@/lib/armoryColors'
import { cn } from '@/lib/utils'
import type { AccessoryDetail, EquipmentDetail, PolishEffect } from '@/types/armory'

// 캐릭터 배너 상세 영역(CharacterBanner)에서 쓰는 장비 슬롯 조각들.

// 장비 슬롯 6종. 빈 슬롯은 공식 전투정보실처럼 부위별 실루엣으로 그린다(아래 EMPTY_SLOT_URL).
export const EQUIPMENT_SLOTS: { key: keyof EquipmentDetail; label: string }[] = [
  { key: 'head', label: '투구' },
  { key: 'shoulder', label: '어깨' },
  { key: 'chest', label: '상의' },
  { key: 'pants', label: '하의' },
  { key: 'gloves', label: '장갑' },
  { key: 'weapon', label: '무기' },
]

export const ACCESSORY_SLOTS: { key: keyof AccessoryDetail; label: string }[] = [
  { key: 'necklace', label: '목걸이' },
  { key: 'earring1', label: '귀걸이1' },
  { key: 'earring2', label: '귀걸이2' },
  { key: 'ring1', label: '반지1' },
  { key: 'ring2', label: '반지2' },
]

// 공식 로스트아크 클라이언트가 쓰는 장식 프레임 원본 에셋 — 아이콘 아틀라스(efui_iconatlas)와는
// 다른 CDN 경로(2018/obt/assets/...)에 있다. 실제 응답으로 확인한 규칙:
// - 아크 패시브 프레임(종류별로 파일이 다름): ItemTitle.leftStr2에 "티어" 표기가 있을 때만 —
//   장비는 번호 없는 파일, 장신구는 2, 팔찌는 3. 완갑은 아크 패시브(진화/깨달음/도약) 3분류
//   어디에도 안 속해 절대 안 뜬다.
// - 전율 전용 프레임: ItemTitle.slotData.petBorder가 0이 아닐 때(확인된 값은 6=전율) — 장비와
//   완갑에서만 실제로 나타난다.
const FRAME_ASSET_BASE = 'https://cdn-lostark.game.onstove.com/2018/obt/assets/images/common/game'
const PET_BORDER_FRAME_URL = `${FRAME_ASSET_BASE}/bg_equipment_petBorder.png`
const ARK_PASSIVE_FRAME_URL = {
  equipment: `${FRAME_ASSET_BASE}/bg_equipment_arkpassive.png`,
  accessory: `${FRAME_ASSET_BASE}/bg_equipment_arkpassive2.png`,
  bracelet: `${FRAME_ASSET_BASE}/bg_equipment_arkpassive3.png`,
} as const

export type ArkPassiveKind = keyof typeof ARK_PASSIVE_FRAME_URL

// 빈 슬롯 실루엣 — 공식 전투정보실(profile.pc.css)이 슬롯마다 깔아 두는 배경 원본이다. 색이 없는
// 어두운 윤곽이라 실제 아이템 아이콘과 헷갈리지 않는다(2026-11-10, 예전 ImageOff 통일을 대체, 사용자
// 확정). 파일 번호는 공식 CSS가 슬롯에 붙인 것 그대로다 — 팔찌는 19, 어빌리티 스톤은 12, 완갑은 20.
// 공식처럼 항상 아이콘 뒤에 깔아 두므로, 아이콘 이미지를 못 불러올 때도 이 실루엣이 보인다.
function emptySlotUrl(fileNumber: number) {
  return `${FRAME_ASSET_BASE}/bg_equipment_slot${fileNumber}.png`
}
const EMPTY_SLOT_URL = {
  head: emptySlotUrl(1),
  shoulder: emptySlotUrl(2),
  chest: emptySlotUrl(3),
  pants: emptySlotUrl(4),
  gloves: emptySlotUrl(5),
  weapon: emptySlotUrl(6),
  necklace: emptySlotUrl(7),
  earring1: emptySlotUrl(8),
  earring2: emptySlotUrl(9),
  ring1: emptySlotUrl(10),
  ring2: emptySlotUrl(11),
  abilityStone: emptySlotUrl(12),
  bracelet: emptySlotUrl(19),
  wristGuard: emptySlotUrl(20),
} as const

export type ArmorySlotKind = keyof typeof EMPTY_SLOT_URL

// 아크 패시브 프레임을 아이콘보다 각 변 기준 몇 px 더 크게 그릴지. 예전 900px 배너(아이콘 44px)의
// 12px을 350px 배너 아이콘 크기(30px)에 맞춰 비례로 줄인 값이다.
const FRAME_OVERHANG_PX = 8

/**
 * 아이콘 박스 위에 겹치는 장식 프레임(들). 공식 사이트 레이어 순서는 아래부터 배경, 장비 이미지,
 * 아크 패시브 테두리, 전율(petBorder) 테두리 순이다(사용자 확인). 두 프레임 다 가운데가 투명이라
 * 아이콘 위에 얹어도 아이콘이 비쳐 보인다. 아크 패시브 테두리만 FRAME_OVERHANG_PX만큼 키우고,
 * 전율 테두리는 항상 아이콘과 같은 크기(100%)다(사용자 확인). 크기는 width/height를 직접 지정하고
 * top/left 50% + translate로 중심을 맞춘다 — img에 음수 inset만 주면 브라우저가 원본 크기를 써서
 * 중심이 어긋났다(사용자 확인).
 */
export function ItemFrames({
  arkPassiveKind,
  isTierGear,
  petBorder,
}: {
  arkPassiveKind: ArkPassiveKind | null
  isTierGear: boolean
  petBorder: number
}) {
  const overlayClassName =
    'pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 select-none'
  const arkPassiveSize = `calc(100% + ${FRAME_OVERHANG_PX}px)`
  return (
    <>
      {arkPassiveKind && isTierGear && (
        <img
          src={ARK_PASSIVE_FRAME_URL[arkPassiveKind]}
          alt=""
          aria-hidden
          className={overlayClassName}
          style={{ width: arkPassiveSize, height: arkPassiveSize }}
        />
      )}
      {/* !!petBorder: 새로고침 전(구 저장 데이터)엔 필드 자체가 없어 undefined다 — undefined/0 둘 다
          "없음"으로 다룬다. 아크 패시브 테두리보다 뒤에 둬서 항상 맨 위에 그려지게 한다. */}
      {!!petBorder && (
        <img
          src={PET_BORDER_FRAME_URL}
          alt=""
          aria-hidden
          className={overlayClassName}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </>
  )
}

/** 30px 아이템 아이콘 + 등급 배경 + 장식 프레임. 레이어는 공식과 같이 아래부터 부위별 빈 슬롯
 * 실루엣, 등급 그라데이션을 깐 아이템 이미지, 장식 프레임 순이다 — 이미지가 없거나 깨지면 실루엣만 남는다. */
export function ItemIcon({
  slot,
  iconUrl,
  grade,
  label,
  arkPassiveKind,
  isTierGear = false,
  petBorder = 0,
  highlighted = false,
}: {
  /** 빈 슬롯 실루엣을 고르는 부위 */
  slot: ArmorySlotKind
  iconUrl: string
  grade: string
  label: string
  arkPassiveKind: ArkPassiveKind | null
  isTierGear?: boolean
  petBorder?: number
  /** 무기처럼 강조할 슬롯이면 테두리를 강조색으로 그린다. */
  highlighted?: boolean
}) {
  const [failedIconUrl, setFailedIconUrl] = useState<string | null>(null)
  const showIcon = !!iconUrl && failedIconUrl !== iconUrl
  return (
    <div className="relative h-[30px] w-[30px] shrink-0">
      <div
        role={showIcon ? undefined : 'img'}
        aria-label={showIcon ? undefined : `${label} 비어 있음`}
        className={cn(
          'h-full w-full overflow-hidden rounded-[3px] border bg-background bg-[length:100%_100%] bg-no-repeat',
          highlighted ? 'border-primary' : 'border-border',
        )}
        style={{ backgroundImage: `url(${EMPTY_SLOT_URL[slot]})` }}
      >
        {showIcon && (
          <img
            src={iconUrl}
            alt={label}
            onError={() => setFailedIconUrl(iconUrl)}
            className="h-full w-full object-cover"
            style={{ background: gradeBackground(grade) ?? undefined }}
          />
        )}
      </div>
      <ItemFrames arkPassiveKind={arkPassiveKind} isTierGear={isTierGear} petBorder={petBorder} />
    </div>
  )
}

export type HoverAlign = 'start' | 'center' | 'end'

/** hover(또는 키보드 포커스) 시에만 뜨는 상세 정보 패널을 자식 위에 겹쳐 붙인다. */
export function HoverDetail({ align, content, children }: { align: HoverAlign; content: ReactNode; children: ReactNode }) {
  return (
    <div className="group/hover relative" tabIndex={0}>
      {children}
      <div
        className={cn(
          'pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-[240px] rounded-lg border border-border bg-card px-3 py-2.5 text-left opacity-0 shadow-xl transition-opacity group-hover/hover:opacity-100 group-focus-visible/hover:opacity-100',
          align === 'start' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'end' && 'right-0',
        )}
      >
        {content}
      </div>
    </div>
  )
}

export function EffectDetailList({ title, effects }: { title: string; effects: PolishEffect[] }) {
  return (
    <div className="flex flex-col gap-1 text-[13px]">
      <p className="font-bold text-foreground">{title}</p>
      {effects.length === 0 ? (
        <p className="text-muted-foreground">정보 없음</p>
      ) : (
        effects.map((effect, index) => (
          <p key={index} style={{ color: effect.color }}>
            {effect.text}
          </p>
        ))
      )}
    </div>
  )
}

/** 완갑 "기본 효과"/"추가 효과"처럼 게임이 색상을 따로 주지 않는 줄글 목록. */
export function PlainEffectList({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-1 text-[13px]">
      <p className="font-bold text-foreground">{title}</p>
      {lines.length === 0 ? (
        <p className="text-muted-foreground">정보 없음</p>
      ) : (
        lines.map((line, index) => (
          <p key={index} className="text-muted-foreground">
            {line}
          </p>
        ))
      )}
    </div>
  )
}

/** 연마/팔찌 효과를 실제 게임 색상(PolishEffect.color) 점으로 요약한다. */
export function EffectDots({ effects }: { effects: PolishEffect[] }) {
  if (effects.length === 0) {
    return <span className="h-1.5 w-1.5 rounded-full bg-muted" />
  }
  return (
    <div className="flex items-center gap-[3px]">
      {effects.map((effect, index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: effect.color, boxShadow: `0 0 4px ${effect.color}66` }}
        />
      ))}
    </div>
  )
}
