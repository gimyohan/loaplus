export interface SessionUser {
  userId: string
  nickname: string | null
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
