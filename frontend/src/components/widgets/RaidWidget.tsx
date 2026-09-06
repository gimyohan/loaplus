import { Ban, Check, Settings } from 'lucide-react'

import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/** "관문" 텍스트 대신 쓰는 아이콘 — U자를 뒤집은(위가 둥글고 아래가 트인) 문/아치 모양(사용자
 * 확정). lucide-react에 정확히 이 모양의 아이콘이 없어 같은 stroke 스타일(24x24, 2px 스트로크,
 * 둥근 끝)로 직접 그린다. */
function GateIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 20V11a7 7 0 0 1 14 0v9" />
    </svg>
  )
}

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
   * 표시 자체를 숨긴다(docs/widgets.typ "레이드" 참고). */
  goldRewardEnabled?: boolean
  onToggleGateCleared?: (gateIndex: number, cleared: boolean) => void
  onToggleMoreReward?: (gateIndex: number, enabled: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 골드(gold)와 귀속 골드(muted)를 색으로만 구분해 보여준다 — "골드"/"귀속" 같은 단위 글자는
 * 붙이지 않는다. 이 슬롯이 골드 획득을 거부 중이면(goldRewardEnabled: false) 실제로 받지 못할
 * 금액을 보여주는 게 오히려 혼란을 주므로, 카탈로그 값과 무관하게 항상 "-"로 표시한다.
 */
function GateRewardText({ gate, goldRewardEnabled }: { gate: RaidGateView; goldRewardEnabled: boolean }) {
  if (!goldRewardEnabled || (gate.goldReward <= 0 && gate.boundGoldReward <= 0)) {
    return <span className="text-center font-mono text-xl leading-tight text-muted-foreground">-</span>
  }
  return (
    <span className="flex flex-wrap items-center justify-center gap-x-1 text-center font-mono text-xl leading-tight">
      {gate.goldReward > 0 && <span className="text-gold">{gate.goldReward.toLocaleString('ko-KR')}</span>}
      {gate.goldReward > 0 && gate.boundGoldReward > 0 && <span className="text-muted-foreground">/</span>}
      {gate.boundGoldReward > 0 && (
        <span className="text-muted-foreground">{gate.boundGoldReward.toLocaleString('ko-KR')}</span>
      )}
    </span>
  )
}

/**
 * 레이드(Raid) 위젯. 관문 칸 전체를 클릭/Enter·Space로 완료 처리하고(별도 체크박스 없음), '더보기'
 * 토글과 획득 골드/귀속골드를 보여준다(docs/widgets.typ "레이드" 참고).
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
  return (
    <div
      className={cn(
        'flex aspect-[5/3] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg',
        className,
      )}
    >
      {/* 상단: 레이드 이름 / 난이도 / 설정 */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-2xl font-semibold text-foreground">{raidName ?? '레이드'}</h3>
          {difficultyName && (
            <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-lg uppercase tracking-wide text-secondary">
              {difficultyName}
            </span>
          )}
          {/* 카탈로그상 이 관문들이 골드를 주더라도, 이 슬롯이 골드 획득을 거부 중이면 받지 못한다 —
              관문마다 "-"만 보이는 이유를 헤더에서 바로 알 수 있게 한다. */}
          {raidName !== null && !goldRewardEnabled && (
            <span
              title="골드 획득 거부 중"
              className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              <Ban className="h-3.5 w-3.5" />
              골드
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label="레이드 설정"
          onClick={onOpenSettings}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* 목표를 아직 고르지 않았으면 관문 대신 안내만 보여준다 */}
      {raidName === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4 text-center">
          <span className="text-sm font-medium text-muted-foreground">목표가 설정되지 않았습니다</span>
          <span className="text-xs text-muted-foreground/70">톱니바퀴를 눌러 레이드를 선택하세요</span>
        </div>
      ) : (
        <div
          className="grid flex-1 divide-x divide-border"
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
                'flex cursor-pointer select-none flex-col items-center justify-center gap-1.5 rounded-md border px-1 py-2 transition-colors',
                gate.cleared ? 'border-primary/40 bg-primary/10' : 'border-transparent hover:bg-muted',
              )}
            >
              {/* 좌/우 칸을 같은 너비(20px)로 둬서 "N관문" 텍스트가 칸 안에서 항상 정중앙에 오게
                  하고, Check 아이콘은 왼쪽 칸에 붙여 텍스트 바로 옆에 자연스럽게 이어지게 한다.
                  (absolute 포지셔닝으로 뺐을 때는 기준이 이 3칸 전체 너비였어서 아이콘이 칸의
                  왼쪽 바깥으로 멀리 떨어져 보이는 문제가 있었다.) */}
              <div className="grid w-full grid-cols-[20px_1fr_20px] items-center gap-1">
                <Check
                  className={cn(
                    'h-5 w-5 shrink-0 justify-self-end transition-opacity',
                    gate.cleared ? 'text-primary' : 'opacity-0',
                  )}
                />
                <span
                  className={cn(
                    'flex items-center justify-center gap-1 font-mono text-lg uppercase tracking-wide',
                    gate.cleared ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {index + 1}
                  <GateIcon className="h-5 w-5 shrink-0" />
                </span>
                <span aria-hidden="true" />
              </div>

              <GateRewardText gate={gate} goldRewardEnabled={goldRewardEnabled} />

              <Tooltip label="더보기">
                <label onClick={(event) => event.stopPropagation()} className="flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={gate.moreRewardEnabled}
                    onChange={(event) => onToggleMoreReward?.(index, event.target.checked)}
                    aria-label={`${index + 1}관문 더보기`}
                    className="h-5 w-5 shrink-0 cursor-pointer rounded-sm border border-border bg-background accent-primary"
                  />
                </label>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
