import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { loadGoogleIdentityServices } from '@/lib/googleIdentity'
import { cn } from '@/lib/utils'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function GoogleLoginButton({ className }: { className?: string }) {
  const { loginWithIdToken } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadGoogleIdentityServices()
      .then((accountsId) => {
        if (cancelled || !buttonRef.current) return

        accountsId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            loginWithIdToken(response.credential).catch(() => {
              setError('로그인에 실패했습니다. 다시 시도해 주세요.')
            })
          },
        })

        accountsId.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          width: 280,
        })
      })
      .catch(() => {
        if (!cancelled) setError('Google 로그인을 불러오지 못했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [loginWithIdToken])

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div ref={buttonRef} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
