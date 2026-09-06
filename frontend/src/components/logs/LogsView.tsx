import { PlusCircle, ScrollText } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ComingSoonView } from '@/components/layout/ComingSoonView'
import { LogList } from '@/components/logs/LogList'
import { OtherIncomeModal } from '@/components/statistics/OtherIncomeModal'
import { ConfirmModal } from '@/components/ui/confirmModal'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { notifyHomeworksChanged } from '@/lib/homeworksEvents'
import { fetchLogs, rollbackLog, type ActionType, type LogEntry } from '@/lib/logs'
import { undoRaidGateClear } from '@/lib/raids'

// 이 액션 타입들의 로그를 Logs 탭에서 되돌리면, 대시보드에 열려 있는 해당 위젯도 다시 조회해
// 반영하도록 알린다(subscribeHomeworksChanged) — 에브니 큐브 티켓 수량과 할의 모래시계
// 스택/완료 여부도 여기서 되돌릴 수 있는 상태이기 때문이다.
const HOMEWORK_ACTION_TYPES: ActionType[] = ['HARVEST_GUARDIAN', 'HARVEST_KURZAN', 'EBONY_CUBE_CLEAR', 'HAL_HOURGLASS_COMPLETE']

export function LogsView() {
  const { characters } = useCharacterDirectory()
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)
  const [isOtherIncomeOpen, setIsOtherIncomeOpen] = useState(false)
  // 되돌리기는 상태/통계를 실제로 되돌리는 되돌릴 수 없는 작업이라(로그 자체도 함께 삭제됨),
  // 카드 삭제(App.tsx)와 같은 원칙으로 확인 모달을 거친다(사용자 확정).
  const [pendingRollback, setPendingRollback] = useState<LogEntry | null>(null)
  // OtherIncomeModal(원래 Statistics 탭 소속)이 캐릭터 드롭다운에 쓰는 형태로 변환한다 — 여기선
  // CharacterDirectoryContext(id/characterName)를, 원래 위치에선 통계 조회 응답(characterId/
  // characterName)을 쓰던 차이만 있고 모달 자체는 그대로 재사용한다.
  const characterOptions = characters.map((c) => ({ characterId: c.id, characterName: c.characterName }))

  useEffect(() => {
    let cancelled = false
    fetchLogs().then((data) => {
      if (!cancelled) setLogs(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleConfirmRollback = async (log: LogEntry) => {
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
      setPendingRollback(null)
    } catch (err) {
      console.error('로그 롤백 실패', err)
    } finally {
      setRollingBackId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 레이드·편린 등 게임 컨텐츠가 자동으로 남기는 로그와 달리, 이 버튼으로 남기는 "기타 수입"만
          유일하게 유저가 직접 로그를 생성하는 경로다(docs/statistics.typ 참고) — 로그 목록 화면에
          있는 게 자연스러워 통계 탭에서 이리로 옮겼다(사용자 확정). 캐릭터가 하나도 없으면
          기록할 대상이 없으므로 숨긴다. */}
      {characterOptions.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsOtherIncomeOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <PlusCircle className="h-4 w-4 text-secondary" />
            기타 수입 기록
          </button>
        </div>
      )}

      {logs === null ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : logs.length === 0 ? (
        <ComingSoonView
          icon={ScrollText}
          title="기록된 로그가 없습니다"
          description="가디언/쿠르잔 전선 수확 등 통계에 반영되는 행위를 하면 여기에 기록됩니다."
        />
      ) : (
        <LogList logs={logs} rollingBackId={rollingBackId} onRollback={setPendingRollback} />
      )}

      <OtherIncomeModal
        open={isOtherIncomeOpen}
        onClose={() => setIsOtherIncomeOpen(false)}
        characters={characterOptions}
        onRecorded={() => fetchLogs().then(setLogs)}
      />

      <ConfirmModal
        open={pendingRollback !== null}
        onClose={() => setPendingRollback(null)}
        onConfirm={() => pendingRollback && handleConfirmRollback(pendingRollback)}
        title="로그 되돌리기"
        message="이 행위를 되돌리면 캐릭터 상태와 통계가 함께 되돌아가고, 이 로그는 삭제됩니다. 계속할까요?"
        confirmLabel="되돌리기"
        isConfirming={pendingRollback !== null && rollingBackId === pendingRollback.id}
      />
    </div>
  )
}
