import { Check, ChevronDown, ChevronUp, RotateCcw, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/modal'
import {
  ABILITY_STONE_INITIAL_STATE,
  applyAbilityStoneAttempt,
  fetchAbilityStoneStrategy,
  gradeFromRawSuccess,
  isAbilityStoneTerminal,
} from '@/lib/abilityStone'
import { cn } from '@/lib/utils'
import type { AbilityStoneOutcome, AbilityStoneSlot, AbilityStoneState } from '@/types/abilityStone'

export interface AbilityStoneModalProps {
  open: boolean
  onClose: () => void
}

const SLOT_LABELS: Record<AbilityStoneSlot, string> = {
  MAJOR: '주 각인',
  MINOR: '부 각인',
  DEBUFF: '디버프',
}

interface TargetPair {
  major: number
  minor: number
}

// 유저가 실제로 자주 노리는 목표 조합(원시 성공 횟수 기준).
const TARGET_PAIRS: TargetPair[] = [
  { major: 7, minor: 7 },
  { major: 9, minor: 7 },
  { major: 10, minor: 6 },
  { major: 10, minor: 7 },
  { major: 9, minor: 9 },
  { major: 10, minor: 10 },
  { major: 7, minor: 9 },
  { major: 6, minor: 10 },
  { major: 7, minor: 10 },
]

function formatPercent(probability: number) {
  return `${(probability * 100).toFixed(probability > 0 && probability < 0.01 ? 4 : 1)}%`
}

/** majorLevel/minorLevel이 일치하는 디버프 0~3 중 확률이 가장 높은 항목을 고른다. */
function pickBestDebuffOutcome(
  outcomes: AbilityStoneOutcome[],
  majorLevel: number,
  minorLevel: number,
): AbilityStoneOutcome | null {
  const matches = outcomes.filter((o) => o.majorLevel === majorLevel && o.minorLevel === minorLevel)
  if (matches.length === 0) return null
  return matches.reduce((best, current) => (current.probability > best.probability ? current : best))
}

type CellState = 'empty' | 'success' | 'fail'

/** 실제 입력한 순서(history) 그대로 칸을 채우고, 남은 칸은 비워둔다 — 게임 화면과 칸 위치가 어긋나면 안 된다. */
function buildRowCells(history: boolean[], remaining: number): CellState[] {
  return [
    ...history.map((success): CellState => (success ? 'success' : 'fail')),
    ...Array<CellState>(remaining).fill('empty'),
  ]
}

interface GridRowProps {
  label: string
  cells: CellState[]
  /** 이 인덱스의 칸만 성공/실패를 직접 입력하는 버튼 한 쌍으로 바뀐다(대기 중인 목표가 이 줄일 때만). */
  pendingIndex?: number
  onRecord?: (success: boolean) => void
}

function GridRow({ label, cells, pendingIndex, onRecord }: GridRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid flex-1 grid-cols-10 gap-1">
        {cells.map((cell, index) =>
          index === pendingIndex && onRecord ? (
            <div
              key={index}
              className="flex aspect-square overflow-hidden rounded-sm ring-2 ring-primary ring-offset-1 ring-offset-card"
            >
              <button
                type="button"
                aria-label={`${label} 실패로 기록`}
                onClick={() => onRecord(false)}
                className="flex flex-1 items-center justify-center bg-red-500 transition-colors hover:bg-red-600"
              >
                <X className="h-3 w-3 text-white" />
              </button>
              <button
                type="button"
                aria-label={`${label} 성공으로 기록`}
                onClick={() => onRecord(true)}
                className="flex flex-1 items-center justify-center bg-green-500 transition-colors hover:bg-green-600"
              >
                <Check className="h-3 w-3 text-white" />
              </button>
            </div>
          ) : (
            <div
              key={index}
              className={cn(
                'aspect-square rounded-sm border',
                cell === 'success' && 'border-green-600/40 bg-green-500',
                cell === 'fail' && 'border-red-600/40 bg-red-500',
                cell === 'empty' && 'border-border bg-muted',
              )}
            />
          ),
        )}
      </div>
    </div>
  )
}

/**
 * 어빌리티 스톤 세공 전략 도구. 캐릭터에 종속되지 않는 순수 계산기라 위젯 자체엔 상태가 없고,
 * 이 모달이 열려 있는 동안만 세공 진행 상태(state)를 들고 있다(닫았다 다시 열면 초기화된다 —
 * 추후 위젯 customData나 서버 저장이 필요해지면 이 state를 부모로 올리면 된다).
 *
 * 흐름: 카드의 "자세히 보기"에서 디버프 단계를 고르면 그 카드가 그 단계로 고정되고(pinnedDebuffLevel),
 * 카드 본문을 누르면 그 카드가 "대기 중"이 되면서 위쪽 진행 상태 그리드의 해당 줄·다음 칸이
 * 성공/실패 버튼 한 쌍으로 바뀐다 — 실제 게임에서 세공한 결과를 거기서 바로 입력한다. 입력하면
 * 상태 전이 규칙에 따라 다음 상태를 계산하고(docs/ability_stone.typ), 그 상태로 서버에서 목표별
 * 확률을 다시 조회한다 — 세공 1회당 API 호출 1번.
 */
export function AbilityStoneModal({ open, onClose }: AbilityStoneModalProps) {
  const [state, setState] = useState<AbilityStoneState>(ABILITY_STONE_INITIAL_STATE)
  const [history, setHistory] = useState<Record<AbilityStoneSlot, boolean[]>>({ MAJOR: [], MINOR: [], DEBUFF: [] })
  const [expandedTarget, setExpandedTarget] = useState<number | null>(null)
  const [pinnedDebuffLevel, setPinnedDebuffLevel] = useState<Record<number, number>>({})
  const [pendingTargetIndex, setPendingTargetIndex] = useState<number | null>(null)

  const [outcomes, setOutcomes] = useState<AbilityStoneOutcome[]>([])
  const [isLoadingOutcomes, setIsLoadingOutcomes] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setIsLoadingOutcomes(true)
    setLoadFailed(false)
    fetchAbilityStoneStrategy(state)
      .then((data) => {
        if (!cancelled) setOutcomes(data)
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingOutcomes(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, state])

  const terminal = isAbilityStoneTerminal(state)
  const finalOutcome = terminal ? outcomes.find((o) => o.probability === 1) : undefined

  const getCardOutcome = (index: number): AbilityStoneOutcome | null => {
    const pair = TARGET_PAIRS[index]!
    const majorLevel = gradeFromRawSuccess(pair.major)
    const minorLevel = gradeFromRawSuccess(pair.minor)
    const pinned = pinnedDebuffLevel[index]
    if (pinned !== undefined) {
      const match = outcomes.find(
        (o) => o.majorLevel === majorLevel && o.minorLevel === minorLevel && o.debuffLevel === pinned,
      )
      if (match) return match
    }
    return pickBestDebuffOutcome(outcomes, majorLevel, minorLevel)
  }

  const pendingOutcome = pendingTargetIndex !== null ? getCardOutcome(pendingTargetIndex) : null
  const pendingSlot = pendingOutcome?.bestAction ?? null

  const handleReset = () => {
    setState(ABILITY_STONE_INITIAL_STATE)
    setHistory({ MAJOR: [], MINOR: [], DEBUFF: [] })
    setExpandedTarget(null)
    setPinnedDebuffLevel({})
    setPendingTargetIndex(null)
  }

  /** 확률이 정확히 0%면 그 수를 둬도 목표 달성이 불가능하므로, 진행 중엔 선택 자체를 막는다. */
  const isUnreachable = (outcome: AbilityStoneOutcome | null) => !outcome?.bestAction || outcome.probability === 0

  const handleCardClick = (index: number) => {
    const outcome = getCardOutcome(index)
    if (isUnreachable(outcome)) return
    setPendingTargetIndex((prev) => (prev === index ? null : index))
  }

  const handlePinDebuff = (index: number, debuffLevel: number) => {
    setPinnedDebuffLevel((prev) => ({ ...prev, [index]: debuffLevel }))
    setExpandedTarget(null)
  }

  const handleRecordResult = (success: boolean) => {
    if (!pendingSlot) return
    setHistory((prev) => ({ ...prev, [pendingSlot]: [...prev[pendingSlot], success] }))
    setState((prev) => applyAbilityStoneAttempt(prev, pendingSlot, success))
    setPendingTargetIndex(null)
  }

  const majorCells = buildRowCells(history.MAJOR, state.majorRemCnt)
  const minorCells = buildRowCells(history.MINOR, state.minorRemCnt)
  const debuffCells = buildRowCells(history.DEBUFF, state.debuffRemCnt)

  return (
    <Modal open={open} onClose={onClose} title="어빌리티 스톤 세공 전략" className="max-w-5xl">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">세공 진행 상태</h3>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              다시 시작
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <GridRow
              label="주 각인"
              cells={majorCells}
              pendingIndex={pendingSlot === 'MAJOR' ? history.MAJOR.length : undefined}
              onRecord={handleRecordResult}
            />
            <GridRow
              label="부 각인"
              cells={minorCells}
              pendingIndex={pendingSlot === 'MINOR' ? history.MINOR.length : undefined}
              onRecord={handleRecordResult}
            />
            <GridRow
              label="디버프"
              cells={debuffCells}
              pendingIndex={pendingSlot === 'DEBUFF' ? history.DEBUFF.length : undefined}
              onRecord={handleRecordResult}
            />
          </div>
          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-green-500" /> 성공
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> 실패
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> 남음
            </span>
            <span className="ml-auto font-mono">현재 확률 {10 * state.currProbabilityIdx + 25}%</span>
          </div>
          {pendingSlot && (
            <p className="text-center text-xs font-medium text-primary">
              위 {SLOT_LABELS[pendingSlot]} 줄의 표시된 칸에서 결과를 눌러주세요
            </p>
          )}
        </section>

        {terminal ? (
          <section className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-center">
            <p className="text-sm font-semibold text-primary">세공이 모두 끝났습니다</p>
            {finalOutcome && (
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                주 각인 {finalOutcome.majorLevel}단계 · 부 각인 {finalOutcome.minorLevel}단계 · 디버프{' '}
                {finalOutcome.debuffLevel}단계로 확정
              </p>
            )}
          </section>
        ) : loadFailed ? (
          <section className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/40 p-6 text-center">
            <p className="text-sm text-muted-foreground">확률을 불러오지 못했습니다</p>
            <button
              type="button"
              onClick={() => setState((prev) => ({ ...prev }))}
              className="rounded-md border border-border px-3 py-1 text-xs text-foreground transition-colors hover:bg-muted"
            >
              다시 시도
            </button>
          </section>
        ) : outcomes.length === 0 ? (
          <section className="flex items-center justify-center rounded-lg border border-border bg-muted/40 p-6">
            <p className="text-sm text-muted-foreground">확률 불러오는 중...</p>
          </section>
        ) : (
          <section
            className={cn(
              'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 transition-opacity',
              isLoadingOutcomes && 'opacity-60',
            )}
          >
            {TARGET_PAIRS.map((pair, index) => {
              const outcome = getCardOutcome(index)
              const isPinned = pinnedDebuffLevel[index] !== undefined
              const isExpanded = expandedTarget === index
              const isPending = pendingTargetIndex === index
              const majorLevel = gradeFromRawSuccess(pair.major)
              const minorLevel = gradeFromRawSuccess(pair.minor)
              const debuffOptions = outcomes
                .filter((o) => o.majorLevel === majorLevel && o.minorLevel === minorLevel)
                .sort((a, b) => a.debuffLevel - b.debuffLevel)
              const cardUnreachable = isUnreachable(outcome)

              return (
                <div
                  key={index}
                  className={cn('flex flex-col gap-2 rounded-lg border bg-card p-4', {
                    'border-primary': isPending,
                    'border-border': !isPending,
                  })}
                >
                  {/* relative + invisible: 자세히 보기 패널이 이 정보 영역만 정확히 덮도록, 원래
                      내용은 자리를 차지한 채(invisible) 숨기고 그 위에 패널을 absolute inset-0으로
                      겹친다 — 카드 높이는 원래 내용 크기 그대로 고정된다. */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => handleCardClick(index)}
                      disabled={cardUnreachable}
                      className={cn(
                        'flex w-full flex-col items-center gap-1 rounded-md py-1 text-center transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:opacity-50',
                        isExpanded && 'invisible',
                      )}
                    >
                      <span className="font-mono text-lg font-bold text-foreground">
                        {pair.major} / {pair.minor}
                      </span>
                      <span className="font-mono text-2xl font-bold text-secondary">
                        {outcome ? formatPercent(outcome.probability) : '-'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        디버프 {outcome?.debuffLevel ?? 0}단계 {isPinned ? '목표' : '기준(최적)'}
                      </span>
                      <span
                        className={cn(
                          'mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          !cardUnreachable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {!outcome?.bestAction
                          ? '완료'
                          : outcome.probability === 0
                            ? '달성 불가'
                            : `다음 세공: ${SLOT_LABELS[outcome.bestAction]}`}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="absolute inset-0 z-10 flex flex-col justify-center gap-1 overflow-y-auto rounded-md border border-border bg-card p-2 shadow-lg">
                        {debuffOptions.map((option) => {
                          const optionUnreachable = isUnreachable(option)
                          return (
                            <button
                              key={option.debuffLevel}
                              type="button"
                              onClick={() => handlePinDebuff(index, option.debuffLevel)}
                              disabled={optionUnreachable}
                              className="flex items-center justify-between rounded px-2 py-1 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                            >
                              <span className="text-muted-foreground">디버프 {option.debuffLevel}단계</span>
                              <span className="font-mono text-secondary">{formatPercent(option.probability)}</span>
                              <span className="text-muted-foreground">
                                {!option.bestAction
                                  ? '완료'
                                  : option.probability === 0
                                    ? '달성 불가'
                                    : SLOT_LABELS[option.bestAction]}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedTarget(isExpanded ? null : index)}
                    className="flex items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    자세히 보기
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </button>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </Modal>
  )
}
