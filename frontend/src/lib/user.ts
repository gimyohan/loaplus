import { apiFetch } from '@/lib/api'

export interface UserProfile {
  userId: string
  nickname: string | null
  hasLostarkApiKey: boolean
  /** 응답을 만든 시점의 판정 스냅샷 — 남은 시간 카운트다운은 premiumExpiresAt으로 직접 계산한다(docs/subscription.typ 참고). */
  isPremium: boolean
  /** ISO 8601 절대 만료 시각. 서버는 "남은 초"를 계산해 내려주지 않는다 — 응답 시점에 이미 과거가 되므로, 클라이언트가 이 값과 현재 시각을 비교해 매초 다시 계산한다. */
  premiumExpiresAt: string | null
  lastVisitedAt: string | null
  createdAt: string
}

export async function fetchProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/user/profile')
}

/** 캐릭터 등록/새로고침 전 선행 조건인 로스트아크 Open API 키를 등록/갱신한다. */
export async function updateLostarkApiKey(apiKey: string): Promise<UserProfile> {
  return apiFetch<UserProfile>('/api/user/lostark-key', {
    method: 'PATCH',
    body: JSON.stringify({ apiKey }),
  })
}

/** 등록된 키를 삭제한다(null로 되돌림). 키가 이미 없어도 204 — 멱등. */
export async function deleteLostarkApiKey(): Promise<void> {
  await apiFetch<void>('/api/user/lostark-key', { method: 'DELETE' })
}
