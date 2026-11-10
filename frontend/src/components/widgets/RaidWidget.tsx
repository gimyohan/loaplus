import { Ban, Check } from 'lucide-react'

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

function GateRewardText({ gate, goldRewardEnabled }: { gate: RaidGateView; goldRewardEnabled: boolean }) {
  if (!goldRewardEnabled || (gate.goldReward <= 0 && gate.boundGoldReward <= 0)) {
    return <span className="font-mono text-[11px] leading-tight text-muted-foreground">-</span>
  }
  return (
    <span className="flex flex-wrap items-center gap-x-0.5 font-mono text-[11px] leading-tight">
      {gate.goldReward > 0 && <span className="text-gold">{gate.goldReward.toLocaleString('ko-KR')}</span>}
      {gate.goldReward > 0 && gate.boundGoldReward > 0 && <span className="text-muted-foreground">/</span>}
      {gate.boundGoldReward > 0 && (
        <span className="text-muted-foreground">{gate.boundGoldReward.toLocaleString('ko-KR')}</span>
      )}
    </span>
  )
}

/**
 * 레이드(Raid) 위젯 — 카드 안 행 하나. 윗줄은 레이드 이름·난이도·골드 거부 표시·설정, 아랫줄은 관문
 * 칸들이다. 관문 칸 전체를 클릭/Enter·Space로 완료 처리하고(별도 체크박스 없음), 칸마다 획득
 * 골드/귀속골드와 '더보기' 토글이 있다(docs/widgets.md "레이드").
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
    <div className={cn(ROW_PADDING_CLASSNAME, 'flex flex-col gap-1.5', className)}>
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
        <p className="text-[13px] text-muted-foreground">목표가 설정되지 않았습니다 · 톱니바퀴를 눌러 레이드를 선택하세요</p>
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
              onClick={() => onToggleGateCleared?.(index, !gate.cleared)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onToggleGateCleared?.(index, !gate.cleared)
              }}
              className={cn(
                'flex min-w-0 cursor-pointer select-none flex-col gap-0.5 rounded-md border px-2 py-1.5 transition-colors',
                gate.cleared
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border hover:border-foreground/30 hover:bg-white/[0.03]',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className={cn('text-xs font-bold', gate.cleared ? 'text-primary' : 'text-foreground')}>
                  {index + 1}관문
                </span>
                {gate.cleared && <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />}
              </div>

              <GateRewardText gate={gate} goldRewardEnabled={goldRewardEnabled} />

              <label
                onClick={(event) => event.stopPropagation()}
                className="mt-0.5 flex w-fit cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <input
                  type="checkbox"
                  checked={gate.moreRewardEnabled}
                  onChange={(event) => onToggleMoreReward?.(index, event.target.checked)}
                  aria-label={`${index + 1}관문 더보기`}
                  className="h-3 w-3 shrink-0 cursor-pointer accent-primary"
                />
                더보기
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
