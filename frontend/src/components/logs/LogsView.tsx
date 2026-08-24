import { RotateCcw, ScrollText } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ComingSoonView } from '@/components/layout/ComingSoonView'
import { Button } from '@/components/ui/button'
import { notifyHomeworksChanged } from '@/lib/homeworksEvents'
import { fetchLogs, rollbackLog, type ActionType, type LogEntry } from '@/lib/logs'
import { undoRaidGateClear } from '@/lib/raids'

// 이 액션 타입들의 로그를 Logs 탭에서 되돌리면, 대시보드에 열려 있는 해당 위젯도 다시 조회해
// 반영하도록 알린다(subscribeHomeworksChanged) — 에브니 큐브 티켓 수량과 할의 모래시계
// 스택/완료 여부도 여기서 되돌릴 수 있는 상태이기 때문이다.
const HOMEWORK_ACTION_TYPES: ActionType[] = ['HARVEST_GUARDIAN', 'HARVEST_KURZAN', 'EBONY_CUBE_CLEAR', 'HAL_HOURGLASS_COMPLETE']

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

export function LogsView() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLogs().then((data) => {
      if (!cancelled) setLogs(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleRollback = async (log: LogEntry) => {
    setRollingBackId(log.id)
    try {
      if (log.actionType === 'RAID_GATE_CLEAR' && log.raidId !== null && log.gateIndex !== null) {
        // 관문 하나를 되돌리면 그보다 늦은 순서의 관문도 함께 미완료로 되돌아간다(연쇄 미완료,
        // docs/widgets.typ "레이드" 참고) — 대시보드 체크박스 해제와 동일한 로직(undoRaidGateClear)을
        // 여기서도 그대로 써서, Logs 탭에서 직접 되돌릴 때도 같은 규칙이 적용되게 한다.
        const raidId = log.raidId
        const gateIndex = log.gateIndex
        await undoRaidGateClear(log.characterId, raidId, gateIndex)
        setLogs(
          (prev) =>
            prev?.filter((entry) => !(entry.raidId === raidId && (entry.gateIndex ?? -1) >= gateIndex)) ?? prev,
        )
      } else {
        await rollbackLog(log.id)
        setLogs((prev) => prev?.filter((entry) => entry.id !== log.id) ?? prev)
      }
      // 대시보드의 가디언/쿠르잔 전선 위젯이 열려 있다면 되돌린 상태를 반영하도록 알려준다.
      if (log.actionType && HOMEWORK_ACTION_TYPES.includes(log.actionType)) {
        notifyHomeworksChanged(log.characterId)
      }
    } catch (err) {
      console.error('로그 롤백 실패', err)
    } finally {
      setRollingBackId(null)
    }
  }

  if (logs === null) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>
  }

  if (logs.length === 0) {
    return (
      <ComingSoonView
        icon={ScrollText}
        title="기록된 로그가 없습니다"
        description="가디언/쿠르잔 전선 수확 등 통계에 반영되는 행위를 하면 여기에 기록됩니다. (CD 테스트 마커 2026-08-25)"
      />
    )
  }

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
              onClick={() => handleRollback(log)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
