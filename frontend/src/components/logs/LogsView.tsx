import { ScrollText } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ComingSoonView } from '@/components/layout/ComingSoonView'
import { LogList } from '@/components/logs/LogList'
import { notifyHomeworksChanged } from '@/lib/homeworksEvents'
import { fetchLogs, rollbackLog, type ActionType, type LogEntry } from '@/lib/logs'
import { undoRaidGateClear } from '@/lib/raids'

// 이 액션 타입들의 로그를 Logs 탭에서 되돌리면, 대시보드에 열려 있는 해당 위젯도 다시 조회해
// 반영하도록 알린다(subscribeHomeworksChanged) — 에브니 큐브 티켓 수량과 할의 모래시계
// 스택/완료 여부도 여기서 되돌릴 수 있는 상태이기 때문이다.
const HOMEWORK_ACTION_TYPES: ActionType[] = ['HARVEST_GUARDIAN', 'HARVEST_KURZAN', 'EBONY_CUBE_CLEAR', 'HAL_HOURGLASS_COMPLETE']

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
        description="가디언/쿠르잔 전선 수확 등 통계에 반영되는 행위를 하면 여기에 기록됩니다."
      />
    )
  }

  return <LogList logs={logs} rollingBackId={rollingBackId} onRollback={handleRollback} />
}
