import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

export interface LinkIconSettingsModalProps {
  open: boolean
  onClose: () => void
  url: string | null
  label: string | null
  onSave: (next: { url: string | null; label: string | null }) => void
}

export function LinkIconSettingsModal({ open, onClose, url, label, onSave }: LinkIconSettingsModalProps) {
  const [urlInput, setUrlInput] = useState(url ?? '')
  const [labelInput, setLabelInput] = useState(label ?? '')

  useEffect(() => {
    if (open) {
      setUrlInput(url ?? '')
      setLabelInput(label ?? '')
    }
  }, [open, url, label])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmedUrl = urlInput.trim()
    const trimmedLabel = labelInput.trim()
    onSave({ url: trimmedUrl || null, label: trimmedLabel || null })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="링크 & 아이콘 설정" className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">링크 주소</span>
          <input
            type="text"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="https://..."
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">이름 (호버 시 표시)</span>
          <input
            type="text"
            value={labelInput}
            onChange={(event) => setLabelInput(event.target.value)}
            placeholder="예: 공략 위키"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  )
}
