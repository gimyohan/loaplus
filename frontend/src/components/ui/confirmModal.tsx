import { useEffect } from 'react'

import { Modal } from '@/components/ui/modal'

export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 확인 요청이 진행 중일 때 버튼을 비활성화한다(중복 클릭 방지). */
  isConfirming?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  isConfirming = false,
}: ConfirmModalProps) {
  // Enter로 확인 버튼을 누른 것과 같게 한다 — Modal이 이미 Escape는 onClose로 처리하므로
  // 여기서는 Enter만 추가한다. 폼 입력이 있는 다른 모달(예: OtherIncomeModal)은 자기
  // <form onSubmit>으로 Enter를 이미 처리하므로, 이 동작은 확인/취소 두 버튼뿐인 이 모달에만 둔다.
  useEffect(() => {
    if (!open || isConfirming) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isConfirming, onConfirm])

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
