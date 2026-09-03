import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { loadGoogleIdentityServices } from '@/lib/googleIdentity'
import { cn } from '@/lib/utils'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export function GoogleLoginButton({ className }: { className?: string }) {
  const { loginWithIdToken } = useAuth()
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  // Google 버튼의 callback은 GIS 초기화 시(아래 useEffect, loginWithIdToken이 바뀔 때만 재실행) 한
  // 번만 등록된다 — 그 안에서 매번 최신 체크박스 값을 읽으려면 state를 직접 클로저로 캡처하면 안
  // 되고(등록 시점 값으로 고정됨) ref로 읽어야 한다.
  const rememberMeRef = useRef(rememberMe)
  rememberMeRef.current = rememberMe

  useEffect(() => {
    let cancelled = false

    loadGoogleIdentityServices()
      .then((accountsId) => {
        if (cancelled || !buttonRef.current) return

        accountsId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            loginWithIdToken(response.credential, rememberMeRef.current).catch(() => {
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
      <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-3.5 w-3.5 accent-primary"
        />
        30일 동안 로그인 상태 유지
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
