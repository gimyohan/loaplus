import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { ActionType, LogEntry } from '@/lib/logs'

const ACTION_LABELS: Record<ActionType, string> = {
  HARVEST_GUARDIAN: '가디언 토벌 수확',
  HARVEST_KURZAN: '쿠르잔 전선 수확',
  GUARDIAN_SHARD_REWARD: '편린 보상 획득',
  GUARDIAN_AZENA_BLESSING_REWARD: '아제나 축복 보상 획득',
  KURZAN_SHARD_REWARD: '편린 보상 획득',
  KURZAN_AZENA_BLESSING_REWARD: '아제나 축복 보상 획득',
  RAID_GATE_CLEAR: '레이드 관문 완료',
  OTHER_INCOME_MANUAL: '기타 수입 기록',
  PARADISE_GOLD_REWARD: '낙원 보상 획득',
  EBONY_CUBE_CLEAR: '에브니 큐브 클리어',
  HAL_HOURGLASS_COMPLETE: '할의 모래시계 완료',
}

function actionLabel(actionType: ActionType | null): string {
  return actionType ? ACTION_LABELS[actionType] : '기타'
}

const numberFormatter = new Intl.NumberFormat('ko-KR')

/**
 * 모든 보상 종류를 "{itemName} x{amount}"로 통일해서 보여준다. gold/boundGold/silver는 서버가
 * 이름이 곧 수량인 카탈로그 원본("200,000골드") 대신 이미 카테고리 라벨("골드")로 일반화해
 * 보내주므로(workspace/backend/src/lib/actionLogs.ts의 toDisplayRewards 참고) 여기서 다시
 * 손볼 필요가 없다 — 그대로 쓰면 "x{amount}"와 금액이 중복 표기되지 않는다.
 */
function formatRewards(rewards: LogEntry['rewards']): string | null {
  if (!rewards || rewards.length === 0) return null
  return rewards.map((reward) => `${reward.itemName} x${numberFormatter.format(reward.amount)}`).join(', ')
}

const dateOnlyFormatter = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' })

/** 1시간 전/하루 전처럼 현재 시각 대비로 보여주고, 2일 이상 지난 로그는 그냥 날짜로 보여준다. */
function formatRelativeDate(createdAt: string): string {
  const date = new Date(createdAt)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffDays >= 2) return dateOnlyFormatter.format(date)
  if (diffDays >= 1) return '하루 전'
  if (diffHours >= 1) return `${diffHours}시간 전`
  if (diffMinutes >= 1) return `${diffMinutes}분 전`
  return '방금 전'
}

export interface LogListProps {
  logs: LogEntry[]
  /** 되돌리기 요청 중인 로그 id. null이면 없음 */
  rollingBackId: string | null
  onRollback: (log: LogEntry) => void
}

/** LogsView(실사용)와 로그인 전 미리보기(PreviewLogsView)가 함께 쓰는 순수 표시 컴포넌트 —
 * fetchLogs/rollbackLog 같은 API 호출은 전혀 하지 않으므로, 실제 UI가 바뀌면 두 곳 모두 그대로
 * 따라간다(사용자 확인: 컴포넌트 재사용으로 미리보기가 실제 UI를 계속 ref하게). */
export function LogList({ logs, rollingBackId, onRollback }: LogListProps) {
  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => {
        const rewardText = formatRewards(log.rewards)
        return (
          <div
            key={log.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{log.characterName}</span>
                <span className="text-sm text-muted-foreground">{actionLabel(log.actionType)}</span>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0">{formatRelativeDate(log.createdAt)}</span>
                {log.description && (
                  <>
                    <span aria-hidden="true" className="shrink-0">
                      ·
                    </span>
                    <span className="truncate">{log.description}</span>
                  </>
                )}
                {rewardText && (
                  <>
                    <span aria-hidden="true" className="shrink-0">
                      ·
                    </span>
                    <span className="truncate text-secondary">{rewardText}</span>
                  </>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              aria-label="로그 되돌리기"
              disabled={rollingBackId === log.id}
              onClick={() => onRollback(log)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
