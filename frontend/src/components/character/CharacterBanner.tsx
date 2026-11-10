import { ChevronDown, RefreshCw, Swords } from 'lucide-react'

import {
  ACCESSORY_SLOTS,
  EQUIPMENT_SLOTS,
  EffectDetailList,
  EffectDots,
  HoverDetail,
  ItemIcon,
  PlainEffectList,
  type HoverAlign,
} from '@/components/character/armorySlots'
import {
  advancedRefineLevelColor,
  engravingLevelColor,
  hasAdvancedRefine,
  qualityColor,
  qualityGaugeGradient,
  refineLevelColor,
} from '@/lib/armoryColors'
import { BANNER_ZOOM_PERCENT, getBannerImagePosition } from '@/lib/bannerImagePosition'
import { cn } from '@/lib/utils'
import type { CharacterSummary } from '@/types/character'

const numberFormatter = new Intl.NumberFormat('ko-KR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export interface CharacterBannerProps {
  character: CharacterSummary
  /** Open API 재동기화 등 '새로고침' 상호작용 (docs/widgets.md 참고) */
  onRefresh?: () => void
  isRefreshing?: boolean
  /** true면 헤더 아래에 장비·장신구·어빌리티 스톤·팔찌·완갑 요약을 펼친다. */
  expanded?: boolean
  /** 넘기면 헤더 아래에 상세 접기/펼치기 버튼이 생긴다. */
  onToggleExpanded?: () => void
  className?: string
}

/**
 * 캐릭터 배너(카드 폭 350px). 예전 배너 3종(요약 10×1 / 기본 10×2 / 상세 10×5, 원본 900px)을 하나로
 * 합친 것이다(docs/ui_redesign.md "캐릭터 상세 배너") — 헤더(초상화·이름·서버/직업·전투력·아이템
 * 레벨)는 항상 보이고, 장비 요약은 헤더 아래에서 접고 펼친다. 폭에 맞춰 흐르는 레이아웃이라
 * ScaleToFit 없이 그대로 그리며, 모바일처럼 카드가 조금 좁아져도 깨지지 않는다(최소 320px).
 */
export function CharacterBanner({
  character,
  onRefresh,
  isRefreshing = false,
  expanded = false,
  onToggleExpanded,
  className,
}: CharacterBannerProps) {
  const { imageUrl, server, characterName, job, itemLevel, combatPower } = character
  // 근본 클래스별로 초상화 안에서 얼굴 위치가 달라서 클래스에 맞는 크롭 위치를 쓴다
  // (lib/bannerImagePosition.ts). 헤더 비율(350×80 ≈ 4.4:1)이 예전 배너(900×180 = 5:1)와 비슷해
  // 같은 튜닝값이 그대로 맞는다.
  const bannerPosition = getBannerImagePosition(job)

  return (
    <div className={cn('relative rounded-xl border border-border bg-card', className)}>
      {/* 초상화 배경 — 헤더 영역에만 깔고 오른쪽으로 옅어진다. 상세 영역의 hover 패널이 카드 밖으로
          뜰 수 있어야 해서, 바깥 컨테이너가 아니라 이 층만 overflow-hidden으로 자른다. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 overflow-hidden rounded-t-xl"
        style={{ maskImage: 'linear-gradient(to right, black 30%, transparent 80%)' }}
        aria-hidden
      >
        {imageUrl && (
          <div
            className="h-full w-full opacity-60"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${BANNER_ZOOM_PERCENT}% auto`,
              backgroundPosition: `${bannerPosition.faceX}% ${bannerPosition.faceY}%`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-card/0 via-card/70 to-card" />
      </div>

      <div className="relative flex h-20 items-center gap-3 px-3">
        <div className="flex min-w-0 flex-1 flex-col items-end">
          {/* 새로고침: 아이콘뿐 아니라 서버명·직업 위에서도 눌리도록 한 버튼으로 묶는다. group 이름을
              붙여(group/refresh) 카드 전체 hover(삭제/설정 버튼용)와 섞이지 않게 한다. */}
          <button
            type="button"
            aria-label="캐릭터 정보 새로고침"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="group/refresh flex min-w-0 max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw
              className={cn(
                'h-3 w-3 shrink-0 transition-transform duration-500 ease-in-out group-hover/refresh:rotate-180',
                isRefreshing && 'animate-spin',
              )}
            />
            <span className="truncate">{server}</span>
            <span className="shrink-0 text-primary">/</span>
            <span className="truncate">{job}</span>
          </button>
          <h2 className="w-full min-w-0 truncate px-1.5 text-right text-lg font-black leading-tight text-white drop-shadow-sm">
            {characterName}
          </h2>
        </div>

        <div className="flex w-[118px] shrink-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <Swords className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="전투력" />
            <span className="font-mono text-[15px] font-bold leading-none text-primary">
              {numberFormatter.format(combatPower)}
            </span>
          </div>
          <div className="h-px w-full bg-border" />
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase text-muted-foreground">LV.</span>
            <span className="font-mono text-[15px] font-bold leading-none text-secondary">
              {numberFormatter.format(itemLevel)}
            </span>
          </div>
        </div>
      </div>

      {onToggleExpanded && (
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          className="relative flex h-7 w-full items-center justify-center gap-1 border-t border-border text-xs text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          장비 정보
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}

      {expanded && <ArmoryDetails character={character} />}
    </div>
  )
}

function alignForIndex(index: number, count: number): HoverAlign {
  if (index === 0) return 'start'
  if (index === count - 1) return 'end'
  return 'center'
}

/** 장비 6종(3×2) + 장신구 5종·어빌리티 스톤·팔찌·완갑(한 줄). 각 슬롯에 hover하면 상세가 뜬다. */
function ArmoryDetails({ character }: { character: CharacterSummary }) {
  const { equipment, accessories, abilityStone, bracelet, wristGuard } = character
  const [stoneA, stoneB] = abilityStone.engravings

  return (
    <div className="relative flex flex-col gap-3 border-t border-border px-3 py-3">
      <div className="grid grid-cols-3 gap-x-2 gap-y-2.5">
        {EQUIPMENT_SLOTS.map(({ key, label }, index) => {
          const slot = equipment[key]
          const qualityColorValue = qualityColor(slot.quality)
          const refineColor = refineLevelColor(slot.refineLevel, slot.itemName, slot.grade)
          const advancedRefineColor = advancedRefineLevelColor(slot.advancedRefineLevel)
          const showAdvancedRefine = hasAdvancedRefine(slot.itemName, slot.grade)
          const column = index % 3
          return (
            <HoverDetail
              key={key}
              align={column === 0 ? 'start' : column === 2 ? 'end' : 'center'}
              content={
                <div className="flex flex-col gap-1 text-[13px]">
                  <p className="font-bold text-foreground">{label}</p>
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
              {/* 셀 전체 폭을 써서, 상급 재련 표시가 없는 슬롯도 품질 바 길이가 다른 슬롯과 같은
                  기준(셀 폭)으로 그려지게 한다. */}
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <ItemIcon
                    slot={key}
                    iconUrl={slot.iconUrl}
                    grade={slot.grade}
                    label={label}
                    arkPassiveKind="equipment"
                    isTierGear={slot.isTierGear}
                    petBorder={slot.petBorder}
                    highlighted={key === 'weapon'}
                  />
                  <span
                    className="whitespace-nowrap font-mono text-[13px] font-bold leading-none"
                    style={{ color: refineColor }}
                  >
                    +{slot.refineLevel}
                    {showAdvancedRefine && (
                      <span style={{ color: advancedRefineColor }}>/+{slot.advancedRefineLevel}</span>
                    )}
                  </span>
                </div>
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${slot.quality}%`,
                      backgroundImage: qualityGaugeGradient(slot.quality),
                      boxShadow: `0 0 4px ${qualityColorValue}66`,
                    }}
                  />
                </div>
              </div>
            </HoverDetail>
          )
        })}
      </div>

      <div className="flex items-start justify-between">
        {ACCESSORY_SLOTS.map(({ key, label }, index) => {
          const slot = accessories[key]
          return (
            <HoverDetail
              key={key}
              align={alignForIndex(index, ACCESSORY_SLOTS.length + 3)}
              content={<EffectDetailList title={`${label} 연마 효과`} effects={slot.polishEffects} />}
            >
              <div className="flex flex-col items-center gap-1.5">
                <ItemIcon
                  slot={key}
                  iconUrl={slot.iconUrl}
                  grade={slot.grade}
                  label={label}
                  arkPassiveKind="accessory"
                  isTierGear={slot.isTierGear}
                />
                <EffectDots effects={slot.polishEffects} />
              </div>
            </HoverDetail>
          )
        })}

        <div className="h-[30px] w-px self-start bg-border" aria-hidden />

        <HoverDetail
          align="center"
          content={
            <div className="flex flex-col gap-1 text-[13px]">
              <p className="font-bold text-foreground">어빌리티 스톤 전투 각인</p>
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
          <div className="flex flex-col items-center gap-1">
            <ItemIcon slot="abilityStone" iconUrl={abilityStone.iconUrl} grade={abilityStone.grade} label="어빌리티 스톤" arkPassiveKind={null} />
            <span className="whitespace-nowrap font-mono text-[10px] font-bold leading-none">
              <span style={{ color: stoneA ? engravingLevelColor(stoneA.level) : undefined }}>{stoneA ? stoneA.level : '-'}</span>
              <span className="text-muted-foreground">/</span>
              <span style={{ color: stoneB ? engravingLevelColor(stoneB.level) : undefined }}>{stoneB ? stoneB.level : '-'}</span>
            </span>
          </div>
        </HoverDetail>

        <HoverDetail align="center" content={<EffectDetailList title="팔찌 효과" effects={bracelet.effects} />}>
          <div className="flex flex-col items-center gap-1.5">
            <ItemIcon
              slot="bracelet"
              iconUrl={bracelet.iconUrl}
              grade={bracelet.grade}
              label="팔찌"
              arkPassiveKind="bracelet"
              isTierGear={bracelet.isTierGear}
            />
            <EffectDots effects={bracelet.effects} />
          </div>
        </HoverDetail>

        {/* 완갑 — 팔찌보다 나중에 추가된 슬롯이라 미착용일 수 있다(itemName이 빈 문자열). 완갑은 아크
            패시브 3분류 어디에도 안 속해 전율(petBorder) 프레임만 뜬다(사용자 확인). */}
        <HoverDetail align="end" content={<PlainEffectList title="완갑 효과" lines={wristGuard.effects} />}>
          <div className="flex flex-col items-center gap-1">
            <ItemIcon
              slot="wristGuard"
              iconUrl={wristGuard.iconUrl}
              grade={wristGuard.grade}
              label="완갑"
              arkPassiveKind={null}
              petBorder={wristGuard.petBorder}
            />
            <span className="whitespace-nowrap font-mono text-[10px] font-bold leading-none text-foreground">
              {wristGuard.itemName ? `+${wristGuard.refineLevel}` : '-'}
            </span>
          </div>
        </HoverDetail>
      </div>
    </div>
  )
}
