import { apiFetch } from '@/lib/api'
import type { SessionUser } from '@/types/auth'

interface SessionResponse {
  authenticated: boolean
  userId?: string
  nickname?: string | null
}

/** 앱 최초 로딩 시 로그인 여부를 확인한다. */
export async function fetchSession(): Promise<SessionUser | null> {
  const data = await apiFetch<SessionResponse>('/api/auth/session')
  if (!data.authenticated || !data.userId) return null
  return { userId: data.userId, nickname: data.nickname ?? null }
}

/** Google ID 토큰을 백엔드로 전달해 로그인(최초 로그인 시 회원가입)한다. rememberMe가 true면
 * 세션 쿠키가 30일간 유지된다(체크 안 하면 브라우저를 닫을 때 만료되는 기존 동작 그대로). */
export async function loginWithGoogleIdToken(idToken: string, rememberMe: boolean): Promise<SessionUser> {
  const data = await apiFetch<{ userId: string; nickname: string | null }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken, rememberMe }),
  })
  return { userId: data.userId, nickname: data.nickname }
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' })
}
