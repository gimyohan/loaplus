import {
  Circle,
  Crown,
  Footprints,
  Gem,
  Hand,
  Headphones,
  Shield,
  Shirt,
  Sparkles,
  Swords,
  Triangle,
  Watch,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { CharacterBanner } from '@/components/character/CharacterBanner'
import {
  advancedRefineLevelColor,
  engravingLevelColor,
  gradeBackgroundColor,
  hasAdvancedRefine,
  isJeonyulItem,
  qualityColor,
  refineLevelColor,
} from '@/lib/armoryColors'
import { BANNER_ZOOM_PERCENT, getBannerImagePosition } from '@/lib/bannerImagePosition'
import { cn } from '@/lib/utils'
import type { AccessoryDetail, EquipmentDetail, PolishEffect } from '@/types/armory'
import type { CharacterSummary } from '@/types/character'

export interface CharacterBannerDetailedProps {
  character: CharacterSummary
  /** Open API 재동기화 등 '새로고침' 상호작용 (docs/widgets.typ 참고) — 배너(10x2)와 공용이다 */
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

// 장비 슬롯 6종. 실제 부위와 더 잘 어울리는 아이콘으로: 투구=Crown(머리), 어깨=Shield(방어구),
// 상의=Shirt, 하의=Footprints(하반신), 장갑=Hand, 무기=Swords.
const EQUIPMENT_SLOTS: { key: keyof EquipmentDetail; label: string; icon: LucideIcon }[] = [
  { key: 'head', label: '투구', icon: Crown },
  { key: 'shoulder', label: '어깨', icon: Shield },
  { key: 'chest', label: '상의', icon: Shirt },
  { key: 'pants', label: '하의', icon: Footprints },
  { key: 'gloves', label: '장갑', icon: Hand },
  { key: 'weapon', label: '무기', icon: Swords },
]

const ACCESSORY_SLOTS: { key: keyof AccessoryDetail; label: string; icon: LucideIcon }[] = [
  { key: 'necklace', label: '목걸이', icon: Sparkles },
  { key: 'earring1', label: '귀걸이1', icon: Headphones },
  { key: 'earring2', label: '귀걸이2', icon: Headphones },
  { key: 'ring1', label: '반지1', icon: Circle },
  { key: 'ring2', label: '반지2', icon: Circle },
]

type Align = 'start' | 'center' | 'end'

const HOVER_PANEL_CLASSNAME = cn(
  'pointer-events-none absolute bottom-full z-30 mb-2 w-max max-w-[380px] rounded-lg border border-border',
  'bg-card p-5 text-left opacity-0 shadow-xl transition-opacity group-hover/hover:opacity-100',
)

/** hover 시에만 뜨는 상세 정보 패널을 자식 위에 겹쳐 붙인다. */
function HoverDetail({ align, content, children }: { align: Align; content: ReactNode; children: ReactNode }) {
  return (
    <div className="group/hover relative">
      {children}
      <div
        className={cn(
          HOVER_PANEL_CLASSNAME,
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

function EffectDetailList({ title, effects }: { title: string; effects: PolishEffect[] }) {
  return (
    <div className="flex flex-col gap-2 text-base">
      <p className="font-semibold text-foreground">{title}</p>
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

/** 완갑 "기본 효과"/"추가 효과"처럼 게임이 색상을 따로 주지 않는 줄글 목록을 보여준다 —
 * EffectDetailList와 달리 PolishEffect.color가 없어 전부 같은 색(text-muted-foreground)이다. */
function PlainEffectList({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="flex flex-col gap-2 text-base">
      <p className="font-semibold text-foreground">{title}</p>
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
function EffectDots({ effects }: { effects: PolishEffect[] }) {
  if (effects.length === 0) {
    return <span className="h-2.5 w-2.5 rounded-full bg-muted" />
  }
  return (
    <div className="flex items-center gap-1.5">
      {effects.map((effect, index) => (
        <span
          key={index}
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: effect.color, boxShadow: `0 0 6px ${effect.color}66` }}
        />
      ))}
    </div>
  )
}

/**
 * 배너 상세(BANNER_DETAILED, 10x5) 위젯. 위쪽 2줄은 배너(10x2, CharacterBanner)와 완전히 같은
 * 내용(이름/스탯)이고, 아래쪽 3줄에 장비 6종·장신구 5종·어빌리티 스톤·팔찌를 색상·숫자 위주로
 * 요약해 보여준다. hover 시 각 슬롯의 상세 정보가 뜬다 (docs/widgets.typ "배너" 참고). 캐릭터
 * 초상화는 위쪽 배너에서 끊기지 않고 아래쪽 장비 영역까지 옅게 이어지는 배경으로 깔린다.
 */
export function CharacterBannerDetailed({
  character,
  onRefresh,
  isRefreshing = false,
  className,
}: CharacterBannerDetailedProps) {
  const { imageUrl, job, equipment, accessories, abilityStone, bracelet, wristGuard } = character
  const bannerPosition = getBannerImagePosition(job)
  const [stoneA, stoneB] = abilityStone.engravings

  return (
    <div
      className={cn(
        'relative flex aspect-[10/5] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 캐릭터 초상화 — 위쪽 배너뿐 아니라 아래쪽 장비 영역까지 옅게 이어지는 배경.
          대각선으로 옅어지는 마스크 + 하단 그라디언트로, 장비 정보 가독성은 그대로 유지한다. */}
      <div
        className="absolute inset-0 z-0"
        style={{ maskImage: 'linear-gradient(135deg, black 0%, black 30%, transparent 72%)' }}
      >
        {imageUrl && (
          <div
            className="h-full w-full opacity-50"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${BANNER_ZOOM_PERCENT}% auto`,
              backgroundPosition: `${bannerPosition.faceX}% ${bannerPosition.faceY}%`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/50 to-card" />
      </div>

      {/* 5줄 중 2줄: 이름/서버/직업/전투력/아이템 레벨 (기존 배너와 동일 내용) */}
      <CharacterBanner
        character={character}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
        hideBackground
        className="relative z-10 aspect-auto flex-[2] rounded-none border-0 shadow-none"
      />

      {/* 5줄 중 3줄: 장비/장신구/어빌리티 스톤/팔찌 요약. 세 블록(장비/스톤·팔찌·완갑/장신구)
          사이 간격을 gap-3 하나로 통일한다 — 각 블록이 자기 padding까지 따로 가지면 블록 경계의
          간격이 장비 내부 두 열 사이 간격(gap-x-3)의 두 배로 겹쳐 보인다. */}
      <div className="relative z-10 flex flex-[3] gap-3">
        {/* 장비 6종 */}
        <div className="grid flex-[5] grid-cols-2 grid-rows-3 gap-x-3 gap-y-1.5 py-3 pl-3">
          {EQUIPMENT_SLOTS.map(({ key, label, icon: Icon }) => {
            const slot = equipment[key]
            const qualityColorValue = qualityColor(slot.quality)
            const refineColor = refineLevelColor(slot.refineLevel, slot.itemName)
            const advancedRefineColor = advancedRefineLevelColor(slot.advancedRefineLevel)
            const showAdvancedRefine = hasAdvancedRefine(slot.itemName)
            const isWeapon = key === 'weapon'
            const isJeonyul = isJeonyulItem(slot.itemName)
            const backgroundColor = gradeBackgroundColor(slot.grade)
            return (
              <HoverDetail
                key={key}
                align="center"
                content={
                  <div className="flex flex-col gap-2 text-base">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-muted-foreground">
                      재련 <span style={{ color: refineColor }}>+{slot.refineLevel}</span>
                    </p>
                    {/* "전율" 세트처럼 상급 재련 자체가 없는 아이템은 표시하지 않는다(hasAdvancedRefine). */}
                    {showAdvancedRefine && (
                      <p className="text-muted-foreground">
                        상급 재련 <span style={{ color: advancedRefineColor }}>{slot.advancedRefineLevel}단계</span>
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      품질 <span style={{ color: qualityColorValue }}>{slot.quality}</span>
                    </p>
                  </div>
                }
              >
                {/* 이 블록을 셀 전체 너비(w-full)로 고정한다 — 예전엔 w-fit으로 내용(아이콘+재련
                    텍스트) 너비만큼만 차지하게 해서 바가 텍스트 끝에 맞춰지게 했었는데, "전율"처럼
                    상급 재련 텍스트가 없는 슬롯만 블록이 좁아져 품질 게이지 바(quality%만큼 채우는
                    바)의 실제 픽셀 길이가 다른 슬롯보다 짧아 보이는 문제가 있었다. 모든 슬롯이 같은
                    너비를 쓰면 품질 값이 같을 때 바 길이도 항상 같아진다. */}
                <div className="grid w-full gap-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background',
                        // box-sizing: border-box라 두께를 키워도 바깥 크기(h-14 w-14)는 그대로고
                        // 안쪽 콘텐츠 영역만 줄어든다 — "안쪽으로 굵어지는" 테두리.
                        isJeonyul ? 'border-4 border-secondary' : isWeapon ? 'border border-primary' : 'border border-border',
                      )}
                      style={{ backgroundColor: backgroundColor ?? undefined }}
                    >
                      {/* Open API가 내려주는 실제 장비 아이콘 이미지를 우선 쓰고, 없으면(구 저장
                          데이터 등) 부위별 lucide 아이콘으로 대체한다. */}
                      {slot.iconUrl ? (
                        <img src={slot.iconUrl} alt={label} className="h-full w-full object-cover" />
                      ) : (
                        <Icon className={cn('h-7 w-7', isWeapon ? 'text-primary' : 'text-muted-foreground')} />
                      )}
                    </div>
                    <span
                      className="font-mono text-xl font-bold leading-none whitespace-nowrap"
                      style={{ color: refineColor }}
                    >
                      +{slot.refineLevel}
                      {showAdvancedRefine && (
                        <span style={{ color: advancedRefineColor }}>/+{slot.advancedRefineLevel}</span>
                      )}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${slot.quality}%`,
                        backgroundColor: qualityColorValue,
                        boxShadow: `0 0 6px ${qualityColorValue}66`,
                      }}
                    />
                  </div>
                </div>
              </HoverDetail>
            )
          })}
        </div>

        {/* 어빌리티 스톤 / 팔찌 / 완갑 — 장비와 같은 grid-rows-3 + gap-y-1.5를 써서 행이 장비
            쪽과 나란히 맞는다(1열짜리 그리드). 좌우 padding은 안 두고 바깥 flex 컨테이너의
            gap-3(장비 내부 두 열 사이 gap-x-3과 같은 값)에만 기대 — 그래야 장비 두 열 사이
            간격과 장비↔이 블록 사이 간격이 똑같아진다. 이미지 크기(h-14)·아이콘+텍스트 줄
            정렬(items-center)도 장비 셀과 동일하게 맞추고, 품질 개념이 없는 항목들이라 품질
            게이지 바는 아예 두지 않는다. */}
        <div className="grid flex-[3] grid-cols-1 grid-rows-3 gap-y-1.5 py-3">
          <HoverDetail
            align="center"
            content={
              <div className="flex flex-col gap-2 text-base">
                <p className="font-semibold text-foreground">어빌리티 스톤 전투 각인</p>
                {abilityStone.engravings.length === 0 ? (
                  <p className="text-muted-foreground">정보 없음</p>
                ) : (
                  abilityStone.engravings.map((engraving, index) => (
                    <p key={index} style={{ color: engravingLevelColor(engraving.level) }}>
                      {engraving.name} Lv.{engraving.level}
                    </p>
                  ))
                )}
              </div>
            }
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
                style={{ backgroundColor: gradeBackgroundColor(abilityStone.grade) ?? undefined }}
              >
                {abilityStone.iconUrl ? (
                  <img src={abilityStone.iconUrl} alt="어빌리티 스톤" className="h-full w-full object-cover" />
                ) : (
                  <Triangle className="h-7 w-7 text-primary" fill="currentColor" fillOpacity={0.2} />
                )}
              </div>
              <span className="font-mono text-xl font-bold leading-none whitespace-nowrap">
                <span className="text-foreground">{stoneA ? `+${stoneA.level}` : '-'}</span>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="text-secondary">{stoneB ? `+${stoneB.level}` : '-'}</span>
              </span>
            </div>
          </HoverDetail>

          <HoverDetail align="center" content={<EffectDetailList title="팔찌 효과" effects={bracelet.effects} />}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
                style={{ backgroundColor: gradeBackgroundColor(bracelet.grade) ?? undefined }}
              >
                {bracelet.iconUrl ? (
                  <img src={bracelet.iconUrl} alt="팔찌" className="h-full w-full object-cover" />
                ) : (
                  <Watch className="h-7 w-7 text-secondary" />
                )}
              </div>
              <EffectDots effects={bracelet.effects} />
            </div>
          </HoverDetail>

          {/* 완갑 — 팔찌보다 나중에 추가된 슬롯이라 캐릭터에 따라 미착용일 수 있다(itemName이
              빈 문자열). 그 경우 어빌리티 스톤의 "-" 표시와 같은 방식으로 빈 상태를 보여준다. */}
          <HoverDetail align="center" content={<PlainEffectList title="완갑 효과" lines={wristGuard.effects} />}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
                style={{ backgroundColor: gradeBackgroundColor(wristGuard.grade) ?? undefined }}
              >
                {wristGuard.iconUrl ? (
                  <img src={wristGuard.iconUrl} alt="완갑" className="h-full w-full object-cover" />
                ) : (
                  <Gem className="h-7 w-7 text-primary" />
                )}
              </div>
              <span className="font-mono text-xl font-bold leading-none whitespace-nowrap text-foreground">
                {wristGuard.itemName ? `+${wristGuard.refineLevel}` : '-'}
              </span>
            </div>
          </HoverDetail>
        </div>

        {/* 장신구 5종 — 가장 오른쪽으로 배치. */}
        <div className="flex flex-[2] flex-col justify-between py-3 pr-4">
          {ACCESSORY_SLOTS.map(({ key, label, icon: Icon }) => {
            const slot = accessories[key]
            return (
              <HoverDetail
                key={key}
                align="end"
                content={<EffectDetailList title={`${label} 연마 효과`} effects={slot.polishEffects} />}
              >
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
                    style={{ backgroundColor: gradeBackgroundColor(slot.grade) ?? undefined }}
                  >
                    {/* 장비와 동일하게, 실제 아이템 이미지가 있으면 우선 쓰고 없으면(구 저장 데이터
                        등) 부위별 lucide 아이콘으로 대체한다. */}
                    {slot.iconUrl ? (
                      <img src={slot.iconUrl} alt={label} className="h-full w-full object-cover" />
                    ) : (
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <EffectDots effects={slot.polishEffects} />
                </div>
              </HoverDetail>
            )
          })}
        </div>
      </div>
    </div>
  )
}
