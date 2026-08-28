import { Check, CheckCircle2, Coffee, Copy, Crown, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { LostarkApiKeyModal } from '@/components/settings/LostarkApiKeyModal'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirmModal'
import { deleteLostarkApiKey, fetchProfile } from '@/lib/user'

// 실제 계좌 정보
const DONATION_BANK_NAME = '국민'
const DONATION_ACCOUNT_NUMBER = '037402-04-302368'
const DONATION_ACCOUNT_HOLDER = '최준'

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
  const [depositCode, setDepositCode] = useState<string | null>(null)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

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
        setDepositCode(profile.depositCode)
      })
      .catch((err) => console.error('프로필 조회 실패', err))
    return () => {
      cancelled = true
    }
  }, [])

  // 계좌번호/무통장입금 코드 복사 버튼 — TemplatePanel의 "코드 복사"와 동일한 패턴(복사 성공
  // 표시를 1.5초 후 되돌림).
  const copyText = async (text: string, onCopied: (copied: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      onCopied(true)
      setTimeout(() => onCopied(false), 1500)
    } catch (err) {
      console.error('클립보드 복사 실패', err)
    }
  }

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

      {/* 프리미엄 결제 창구가 아니다 — 그냥 마음에 들면 커피 한 잔 사달라는 정도의 가벼운 후원
          요청이다(docs/subscription.typ의 프리미엄 무통장입금과는 별개 목적). deposit_code는
          같은 값을 재사용한다 — 입금자명에 적어두면 누가 보낸 후원인지 알 수 있다는 점만
          공유할 뿐, 여기서 프리미엄을 언급하거나 광고하지 않는다. */}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">커피 한 잔 할래요~</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          LoaPlus는 개인 개발자가 취미로 만들고 있는 서비스예요. 잘 쓰고 계시다면, 부담 없이 커피 한 잔 값만 보내주셔도
          큰 힘이 됩니다.
        </p>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <span className="text-sm text-foreground">
            {DONATION_BANK_NAME} {DONATION_ACCOUNT_NUMBER} ({DONATION_ACCOUNT_HOLDER})
          </span>
          <button
            type="button"
            aria-label={copiedAccount ? '복사됨' : '계좌번호 복사'}
            onClick={() => copyText(DONATION_ACCOUNT_NUMBER, setCopiedAccount)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {copiedAccount ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {depositCode && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <div>
              <span className="text-sm text-foreground">
                입금자명에 <span className="font-mono font-semibold text-primary">{depositCode}</span> 적어주시면 감사하겠습니다
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">누가 보내주셨는지 알 수 있는 내 코드예요.</p>
            </div>
            <button
              type="button"
              aria-label={copiedCode ? '복사됨' : '코드 복사'}
              onClick={() => copyText(depositCode, setCopiedCode)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
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
