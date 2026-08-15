import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { fetchSession, loginWithGoogleIdToken, logout as logoutRequest } from '@/lib/auth'
import type { AuthStatus, SessionUser } from '@/types/auth'

interface AuthContextValue {
  status: AuthStatus
  user: SessionUser | null
  loginWithIdToken: (idToken: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchSession()
      .then((sessionUser) => {
        if (cancelled) return
        setUser(sessionUser)
        setStatus(sessionUser ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (cancelled) return
        setUser(null)
        setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loginWithIdToken = useCallback(async (idToken: string) => {
    const sessionUser = await loginWithGoogleIdToken(idToken)
    setUser(sessionUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo(
    () => ({ status, user, loginWithIdToken, logout }),
    [status, user, loginWithIdToken, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
