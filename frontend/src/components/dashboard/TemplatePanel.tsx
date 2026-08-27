import { Check, Copy, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirmModal'
import { decodeTemplateCode, encodeTemplateCode } from '@/lib/templateCode'
import { cn } from '@/lib/utils'
import type { TemplateLayout } from '@/types/template'
import type { PlacedWidget } from '@/types/widget'

export interface TemplatePanelProps {
  className?: string
  widgets: PlacedWidget[]
  /** 이 카드의 그리드 세로 칸 수(높이) — 코드에도 그대로 담긴다. */
  rows: number
  /** 아직 카드가 캐릭터에 귀속되지 않았으면(characterId 없음) 코드를 적용할 수 없다. */
  boundCharacterId?: string
  /** 코드를 적용하기로 확정된 뒤 호출된다 — 실제 서버 반영은 WidgetDashboard가 한다. */
  onApplyLayout: (layout: TemplateLayout) => Promise<void> | void
  /** 배치 초기화가 확정된 뒤 호출된다. 위젯을 전부 지우고 그리드 높이를 기본값으로 되돌리되,
   * 캐릭터 귀속은 그대로 유지한다 — 실제 반영은 WidgetDashboard가 한다. */
  onResetLayout: () => Promise<void> | void
}

/**
 * 위젯 설정 모달에서 위젯 목록(WidgetPalette) 위에 놓이는, 한 줄짜리 간단한 패널. DB에 템플릿을
 * 저장하는 대신, 현재 배치를 문자열 코드로 인코딩해 사용자가 직접 보관/공유하게 하고, 그 코드를
 * 붙여넣으면 다시 그 배치로 되돌린다. 코드 자체를 화면에 늘어놓을 필요는 없으므로(복사만 하면
 * 되는 값) 복사 버튼만 두고, 코드는 클립보드로만 오간다. "적용"은 덮어쓰기다 — 코드에 없는
 * 위젯(레이드 진행 상태 포함)은 지워지고 코드에 담긴 배치만 남으므로, 적용 전에 확인을 받는다.
 */
export function TemplatePanel({
  className,
  widgets,
  rows,
  boundCharacterId,
  onApplyLayout,
  onResetLayout,
}: TemplatePanelProps) {
  const currentCode = useMemo(() => encodeTemplateCode(widgets, rows), [widgets, rows])
  const [copied, setCopied] = useState(false)

  const [codeInput, setCodeInput] = useState('')
  const [pendingLayout, setPendingLayout] = useState<TemplateLayout | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('코드 복사 실패', err)
    }
  }

  const handleLoadClick = () => {
    setParseError(null)
    const decoded = decodeTemplateCode(codeInput)
    if (!decoded) {
      setParseError('코드를 확인해주세요. 올바르지 않거나 손상된 코드입니다.')
      return
    }
    setPendingLayout(decoded)
  }

  const handleApplyConfirmed = () => {
    if (!pendingLayout) return
    setIsApplying(true)
    Promise.resolve(onApplyLayout(pendingLayout))
      .then(() => {
        setPendingLayout(null)
        setCodeInput('')
      })
      .catch((err) => {
        console.error('배치 코드 적용 실패', err)
        setParseError('코드를 적용하지 못했습니다')
      })
      .finally(() => setIsApplying(false))
  }

  const handleResetConfirmed = () => {
    setIsResetting(true)
    Promise.resolve(onResetLayout())
      .then(() => setIsResetConfirmOpen(false))
      .catch((err) => console.error('배치 초기화 실패', err))
      .finally(() => setIsResetting(false))
  }

  return (
    <div className={cn('flex flex-col justify-center gap-2 rounded-xl border border-border bg-card p-3', className)}>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={codeInput}
          onChange={(event) => {
            setCodeInput(event.target.value)
            setParseError(null)
          }}
          placeholder="코드 붙여넣기"
          disabled={!boundCharacterId}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Button
          type="button"
          className="h-7 shrink-0 px-2.5 py-0 text-xs"
          disabled={!boundCharacterId || !codeInput.trim()}
          onClick={handleLoadClick}
        >
          적용
        </Button>
        <button
          type="button"
          aria-label={copied ? '복사됨' : '코드 복사'}
          onClick={handleCopy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        <div className="ml-0.5 h-5 w-px shrink-0 self-center bg-border" aria-hidden="true" />

        {/* 배치 초기화: 위젯 전체 삭제 + 그리드 높이 기본값 복원(캐릭터 귀속은 유지) — 되돌릴 수
            없으므로 배치 코드 적용과 동일하게 ConfirmModal로 한 번 더 확인받는다. */}
        <button
          type="button"
          aria-label="배치 초기화"
          title="배치 초기화"
          disabled={!boundCharacterId}
          onClick={() => setIsResetConfirmOpen(true)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {!boundCharacterId && (
        <p className="text-xs text-muted-foreground">캐릭터를 먼저 지정해야 코드를 쓸 수 있습니다.</p>
      )}
      {parseError && <p className="text-xs text-destructive">{parseError}</p>}

      <ConfirmModal
        open={pendingLayout !== null}
        onClose={() => setPendingLayout(null)}
        onConfirm={handleApplyConfirmed}
        title="배치 코드 적용"
        message={`이 코드를 적용하면 현재 배치(레이드 진행 상태 포함)가 모두 사라지고, 코드에 담긴 위젯 배치(${pendingLayout?.widgets.length ?? 0}개)로 완전히 덮어씌워집니다. 계속할까요?`}
        confirmLabel="적용"
        isConfirming={isApplying}
      />

      <ConfirmModal
        open={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirmed}
        title="배치 초기화"
        message="이 카드의 위젯 배치(레이드 진행 상태 포함)가 모두 사라지고 그리드 높이도 기본값으로 되돌아갑니다. 캐릭터 귀속은 그대로 유지됩니다. 계속할까요?"
        confirmLabel="초기화"
        isConfirming={isResetting}
      />
    </div>
  )
}
