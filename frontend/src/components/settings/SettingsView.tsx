import { CheckCircle2, Crown, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { LostarkApiKeyModal } from '@/components/settings/LostarkApiKeyModal'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirmModal'
import { deleteLostarkApiKey, fetchProfile } from '@/lib/user'

/**
 * premiumExpiresAt(절대 시각)과 현재 시각을 매초 비교해 남은 초를 계산한다. 서버는 "남은 초"를
 * 직접 계산해 내려주지 않는다 — 응답이 도착한 시점에 이미 과거가 되므로 클라이언트가 전담한다
 * (docs/subscription.typ "몇 초 남았는지는 서버가 아니라 클라이언트가 계산" 참고).
 */
function usePremiumCountdown(premiumExpiresAt: string | null): number | null {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!premiumExpiresAt) {
      setRemainingSeconds(null)
      return
    }

    const expiresAtMs = new Date(premiumExpiresAt).getTime()
    const tick = () => {
      setRemainingSeconds(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)))
    }

    tick()
    const intervalId = window.setInterval(tick, 1000)
    return () => window.clearInterval(intervalId)
  }, [premiumExpiresAt])

  return remainingSeconds
}

/**
 * 계정/서비스 설정 탭. 로스트아크 Open API 키 관리와 구독 상태를 보여준다 — 키 값 자체는 서버가
 * 다시 내려주지 않으므로(암호화 저장, docs/db_schema.typ 참고) 등록 여부(hasLostarkApiKey)만
 * 보여주고, 실제 값 입력/삭제는 각각 모달로 처리한다.
 */
export function SettingsView() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const remainingSeconds = usePremiumCountdown(premiumExpiresAt)
  const showPremiumCountdown = isPremium && remainingSeconds !== null && remainingSeconds > 0

  useEffect(() => {
    let cancelled = false
    fetchProfile()
      .then((profile) => {
        if (cancelled) return
        setHasApiKey(profile.hasLostarkApiKey)
        setIsPremium(profile.isPremium)
        setPremiumExpiresAt(profile.premiumExpiresAt)
      })
      .catch((err) => console.error('프로필 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [])

  const handleRemove = async () => {
    setIsRemoving(true)
    try {
      await deleteLostarkApiKey()
      setHasApiKey(false)
      setIsRemoveConfirmOpen(false)
    } catch (err) {
      console.error('API 키 삭제 실패', err)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {showPremiumCountdown && (
        <section className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-5">
          <Crown className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm font-medium text-foreground">
            <span className="font-mono font-semibold text-primary">{remainingSeconds}</span>초 동안 함께 할 예정입니다
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">로스트아크 Open API 키</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            캐릭터 등록·새로고침과 거래소 시세 갱신에 사용됩니다. 등록한 키는 암호화되어 저장되며 다시 보여지지 않습니다.
          </p>
        </div>

        {hasApiKey === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
            {hasApiKey ? (
              <>
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  등록됨
                </span>
                <Button
                  variant="outline"
                  className="border-red-600/40 text-red-600 hover:bg-red-600/10 hover:text-red-600"
                  onClick={() => setIsRemoveConfirmOpen(true)}
                >
                  삭제
                </Button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <KeyRound className="h-4 w-4" />
                  등록된 키가 없습니다
                </span>
                <Button onClick={() => setIsKeyModalOpen(true)}>등록</Button>
              </>
            )}
          </div>
        )}
      </section>

      <LostarkApiKeyModal
        open={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onRegistered={() => setHasApiKey(true)}
      />

      <ConfirmModal
        open={isRemoveConfirmOpen}
        onClose={() => setIsRemoveConfirmOpen(false)}
        onConfirm={handleRemove}
        title="API 키 삭제"
        message="등록된 로스트아크 API 키를 삭제할까요? 삭제하면 다시 등록하기 전까지 캐릭터 등록·새로고침과 거래소 시세 갱신을 사용할 수 없습니다."
        isConfirming={isRemoving}
      />
    </div>
  )
}
