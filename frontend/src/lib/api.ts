import { showToast } from '@/lib/toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  status: number
  code?: string

  constructor(status: number, code?: string) {
    super(code ?? `request_failed_${status}`)
    this.status = status
    this.code = code
  }
}

/**
 * 로스트아크 Open API 쓰로틀링 관련 429 두 종류를 여기서 한 번에 알림으로 띄운다 — 호출부마다
 * 따로 처리하지 않아도 모든 엔드포인트에 자동 적용된다 (lib/lostarkKeyResolution.ts 참고).
 */
function notifyIfThrottled(status: number, code: string | undefined, body: unknown): void {
  if (status !== 429) return

  if (code === 'lostark_shared_key_throttled') {
    const seconds =
      typeof body === 'object' && body !== null && typeof (body as { retryAfterSeconds?: unknown }).retryAfterSeconds === 'number'
        ? (body as { retryAfterSeconds: number }).retryAfterSeconds
        : undefined
    showToast({
      variant: 'warning',
      message:
        (seconds !== undefined
          ? `공용 API 키 사용량이 많아 ${seconds}초 후에 다시 시도할 수 있어요. `
          : '공용 API 키 사용량이 많아 잠시 후 다시 시도할 수 있어요. ') +
        '설정 탭에서 개인 API 키를 등록하면 더 나은 한도를 사용할 수 있습니다.',
      durationMs: 6000,
    })
    return
  }

  if (code === 'lostark_api_rate_limited') {
    showToast({
      variant: 'warning',
      message: '로스트아크 Open API 호출이 일시적으로 제한되었어요. 잠시 후 다시 시도해주세요.',
    })
  }
}

/** 백엔드 API 호출 공통 wrapper. 세션 쿠키를 함께 보내고, 실패 시 ApiError를 던진다. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => undefined)
    notifyIfThrottled(response.status, body?.error, body)
    throw new ApiError(response.status, body?.error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
