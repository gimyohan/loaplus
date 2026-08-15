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

/** Google ID 토큰을 백엔드로 전달해 로그인(최초 로그인 시 회원가입)한다. */
export async function loginWithGoogleIdToken(idToken: string): Promise<SessionUser> {
  const data = await apiFetch<{ userId: string; nickname: string | null }>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  })
  return { userId: data.userId, nickname: data.nickname }
}

export async function logout(): Promise<void> {
  await apiFetch<void>('/api/auth/logout', { method: 'POST' })
}
