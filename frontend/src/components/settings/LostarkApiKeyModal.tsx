import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { updateLostarkApiKey } from '@/lib/user'

export interface LostarkApiKeyModalProps {
  open: boolean
  onClose: () => void
  /** 성공적으로 등록/갱신된 뒤 호출된다 — 호출부가 hasLostarkApiKey를 true로 반영한다. */
  onRegistered: () => void
}

/**
 * 로스트아크 Open API 키 등록/갱신 모달. 서버는 이미 키가 있어도 그대로 덮어쓰므로(Create/Update
 * 겸용, docs/api.typ 참고) 이 모달 하나로 최초 등록과 재등록을 모두 처리한다. 값 자체를 다시
 * 보여주는 조회 경로가 없으므로(암호화 저장, 프론트 재노출 금지) 입력창은 항상 빈 상태로 시작한다.
 */
export function LostarkApiKeyModal({ open, onClose, onRegistered }: LostarkApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setApiKey('')
      setError(null)
    }
  }, [open])

  const canSubmit = apiKey.trim().length > 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await updateLostarkApiKey(apiKey.trim())
      onRegistered()
      onClose()
    } catch {
      setError('키 등록에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="로스트아크 API 키 등록" className="max-w-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          <a
            href="https://developer-lostark.game.onstove.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            로스트아크 Open API 발급 페이지
          </a>
          에서 발급받은 키를 입력하세요. 암호화되어 저장되며, 등록 후에는 값을 다시 보여주지 않습니다.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lostark-api-key" className="text-sm font-medium text-foreground">
            API 키
          </label>
          <input
            id="lostark-api-key"
            type="password"
            autoFocus
            autoComplete="off"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="발급받은 API 키를 붙여넣으세요"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? '등록 중...' : '등록'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
