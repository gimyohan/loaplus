import { Ban, Check, Plus } from 'lucide-react'

import { ROW_PADDING_CLASSNAME, RowSettingsButton, RowTitle } from '@/components/widgets/rowParts'
import { cn } from '@/lib/utils'

export interface RaidGateView {
  cleared: boolean
  moreRewardEnabled: boolean
  goldReward: number
  boundGoldReward: number
}

export interface RaidWidgetProps {
  /** null이면 아직 목표를 고르지 않은 빈 슬롯 — 관문 대신 안내 문구를 보여준다 */
  raidName: string | null
  /** 난이도 표시 (예: "하드") */
  difficultyName: string | null
  gates: RaidGateView[]
  /** 이 슬롯의 골드 획득 허용/거부. false면 관문을 완료해도 골드를 받지 못하므로 관문별 획득량
   * 표시 자체를 숨긴다(docs/widgets.md "레이드" 참고). */
  goldRewardEnabled?: boolean
  onToggleGateCleared?: (gateIndex: number, cleared: boolean) => void
  onToggleMoreReward?: (gateIndex: number, enabled: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/** 관문 알약 안에 보일 짧은 골드 표시 — 골드가 있으면 골드, 없으면 귀속골드(흐리게), 둘 다 없거나
 * 골드 획득을 거부 중이면 "-". 골드/귀속골드 전체는 알약 툴팁(gateTitle)에 있다. */
function GateRewardText({ gate, goldRewardEnabled }: { gate: RaidGateView; goldRewardEnabled: boolean }) {
  if (!goldRewardEnabled || (gate.goldReward <= 0 && gate.boundGoldReward <= 0)) {
    return <span className="text-muted-foreground">-</span>
  }
  if (gate.goldReward > 0) return <span className="text-gold">{gate.goldReward.toLocaleString('ko-KR')}</span>
  return <span className="text-muted-foreground">{gate.boundGoldReward.toLocaleString('ko-KR')}</span>
}

function gateTitle(index: number, gate: RaidGateView, goldRewardEnabled: boolean) {
  const parts = [`${index + 1}관문`]
  if (!goldRewardEnabled) parts.push('골드 획득 거부 중')
  else {
    if (gate.goldReward > 0) parts.push(`골드 ${gate.goldReward.toLocaleString('ko-KR')}`)
    if (gate.boundGoldReward > 0) parts.push(`귀속골드 ${gate.boundGoldReward.toLocaleString('ko-KR')}`)
  }
  if (gate.moreRewardEnabled) parts.push('더보기 켬')
  return parts.join(' · ')
}

/**
 * 레이드(Raid) 위젯 — 카드 안 행 하나. 윗줄은 레이드 이름·난이도·골드 거부 표시·설정, 아랫줄은 관문
 * 알약들이다. 알약을 클릭/Enter·Space하면 그 관문을 완료 처리하고(별도 체크박스 없음), 알약 안에
 * 골드(없으면 귀속골드)와 '더보기' 토글(+)이 있다. 골드/귀속골드 전체는 알약 툴팁에 보인다
 * (docs/widgets.md "레이드").
 */
export function RaidWidget({
  raidName,
  difficultyName,
  gates,
  goldRewardEnabled = true,
  onToggleGateCleared,
  onToggleMoreReward,
  onOpenSettings,
  className,
}: RaidWidgetProps) {
  const allCleared = gates.length > 0 && gates.every((gate) => gate.cleared)

  return (
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <RowTitle done={allCleared}>{raidName ?? '레이드'}</RowTitle>
          {difficultyName && (
            <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-px text-xs font-bold text-secondary">
              {difficultyName}
            </span>
          )}
          {/* 카탈로그상 골드를 주는 관문이라도 이 슬롯이 골드 획득을 거부 중이면 받지 못한다 — 관문마다
              "-"만 보이는 이유를 제목 옆에서 바로 알 수 있게 한다. */}
          {raidName !== null && !goldRewardEnabled && (
            <span
              title="골드 획득 거부 중"
              className="flex shrink-0 items-center gap-0.5 rounded-md bg-white/[0.06] px-1.5 py-px text-[11px] text-muted-foreground"
            >
              <Ban className="h-3 w-3" />
              골드
            </span>
          )}
        </div>
        <RowSettingsButton label="레이드 설정" onClick={onOpenSettings} />
      </div>

      {raidName === null ? (
        <p className="truncate text-[13px] text-muted-foreground">목표 미설정 · 톱니바퀴를 눌러 레이드를 고르세요</p>
      ) : (
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(gates.length, 1)}, minmax(0, 1fr))` }}
        >
          {gates.map((gate, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              aria-pressed={gate.cleared}
              aria-label={`${index + 1}관문 완료`}
              title={gateTitle(index, gate, goldRewardEnabled)}
              onClick={() => onToggleGateCleared?.(index, !gate.cleared)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onToggleGateCleared?.(index, !gate.cleared)
              }}
              className={cn(
                'flex h-7 min-w-0 cursor-pointer select-none items-center gap-1 rounded-md border pl-1.5 pr-0.5 transition-colors',
                gate.cleared
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border hover:border-foreground/30 hover:bg-white/[0.03]',
              )}
            >
              <span
                className={cn(
                  'flex shrink-0 items-center text-xs font-bold',
                  gate.cleared ? 'text-primary' : 'text-foreground',
                )}
              >
                {gate.cleared && <Check className="mr-0.5 h-3 w-3" strokeWidth={3} />}
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-right font-mono text-[11px]">
                <GateRewardText gate={gate} goldRewardEnabled={goldRewardEnabled} />
              </span>
              {/* 더보기 토글 — 관문 완료 클릭으로 번지지 않게 막는다. */}
              <button
                type="button"
                aria-label={`${index + 1}관문 더보기`}
                aria-pressed={gate.moreRewardEnabled}
                title="더보기"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleMoreReward?.(index, !gate.moreRewardEnabled)
                }}
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors',
                  gate.moreRewardEnabled
                    ? 'bg-primary/25 text-primary'
                    : 'text-muted-foreground/70 hover:bg-white/[0.08] hover:text-foreground',
                )}
              >
                <Plus className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
