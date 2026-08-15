import type { PrismaClient } from '@prisma/client'

import { env } from './env.js'
import { decryptLostarkApiKey } from './lostarkKeyCrypto.js'

export type LostarkApiKeySource = 'personal' | 'shared'

export interface ResolvedLostarkApiKey {
  apiKey: string
  source: LostarkApiKeySource
}

/**
 * 개인 키가 있으면 그 키를, 없으면 서버 공용 키(LOSTARK_SHARED_API_KEY)로 폴백한다. 개인 키도
 * 공용 키도 없으면 null(호출부가 400 lostark_key_required로 응답) — docs/api.typ의 "외부 API
 * 연동 세부사항" 참고.
 */
export async function resolveLostarkApiKey(
  prisma: PrismaClient,
  userId: string,
): Promise<ResolvedLostarkApiKey | null> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  if (user.lostarkApiKey) {
    return { apiKey: decryptLostarkApiKey(user.lostarkApiKey), source: 'personal' }
  }
  if (env.LOSTARK_SHARED_API_KEY) {
    return { apiKey: env.LOSTARK_SHARED_API_KEY, source: 'shared' }
  }
  return null
}

export type SharedKeyThrottleResult = { allowed: true } | { allowed: false; retryAfterSeconds: number }

// 프로세스 메모리 안의 유저별 "마지막으로 공용 키를 소비한 시각" — 단일 인스턴스 배포를
// 전제로 한 단순한 방식이며(docs/market_price.typ "동시 갱신 경합"의 in-flight Set과 동일한
// 전제), 서버 재시작 시 초기화되는 것도 감수한다.
const lastSharedKeyUseAt = new Map<string, number>()

/**
 * 개인 키가 없는 유저 전용 쓰로틀. 캐릭터 배너 3종 + 거래소 시세 2종, 총 5개 엔드포인트가
 * userId 하나로 쿨다운을 공유한다(엔드포인트별로 따로 세지 않음) — docs/api.typ 동일 섹션 참고.
 * 통과(allowed: true)한 호출만 타이머를 갱신한다.
 */
export function checkSharedKeyThrottle(userId: string): SharedKeyThrottleResult {
  const windowMs = env.LOSTARK_SHARED_KEY_THROTTLE_SECONDS * 1000
  const now = Date.now()
  const lastUseAt = lastSharedKeyUseAt.get(userId)

  if (lastUseAt !== undefined) {
    const elapsedMs = now - lastUseAt
    if (elapsedMs < windowMs) {
      return { allowed: false, retryAfterSeconds: Math.ceil((windowMs - elapsedMs) / 1000) }
    }
  }

  lastSharedKeyUseAt.set(userId, now)
  return { allowed: true }
}
