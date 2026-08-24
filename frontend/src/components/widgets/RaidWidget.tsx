import { Check, Settings } from 'lucide-react'

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
  onToggleGateCleared?: (gateIndex: number, cleared: boolean) => void
  onToggleMoreReward?: (gateIndex: number, enabled: boolean) => void
  onOpenSettings?: () => void
  className?: string
}

/**
 * 거래 가능한 골드(secondary)와 귀속 골드(muted)를 색으로만 구분해 보여준다 — "골드"/"귀속" 같은
 * 단위 글자는 붙이지 않는다.
 */
function GateRewardText({ gate }: { gate: RaidGateView }) {
  if (gate.goldReward <= 0 && gate.boundGoldReward <= 0) {
    return <span className="text-center font-mono text-sm leading-tight text-muted-foreground">-</span>
  }
  return (
    <span className="flex flex-wrap items-center justify-center gap-x-1 text-center font-mono text-sm leading-tight">
      {gate.goldReward > 0 && <span className="text-secondary">{gate.goldReward.toLocaleString('ko-KR')}</span>}
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
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-xl font-semibold text-foreground">{raidName ?? '레이드'}</h3>
          {difficultyName && (
            <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-base uppercase tracking-wide text-secondary">
              {difficultyName}
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
                    'text-center font-mono text-base uppercase tracking-wide',
                    gate.cleared ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {index + 1}관문
                </span>
                <span aria-hidden="true" />
              </div>

              <GateRewardText gate={gate} />

              <label
                onClick={(event) => event.stopPropagation()}
                className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={gate.moreRewardEnabled}
                  onChange={(event) => onToggleMoreReward?.(index, event.target.checked)}
                  aria-label={`${index + 1}관문 더보기`}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded-sm border border-border bg-background accent-primary"
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
