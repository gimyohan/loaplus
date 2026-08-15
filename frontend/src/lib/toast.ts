export type ToastVariant = 'info' | 'warning'

export interface ToastInput {
  message: string
  variant?: ToastVariant
  durationMs?: number
}

export interface Toast extends ToastInput {
  id: string
  variant: ToastVariant
  durationMs: number
}

type Listener = (toast: Toast) => void

const listeners = new Set<Listener>()

/**
 * apiFetch(lib/api.ts)는 React 트리 밖의 평범한 함수라 context를 못 쓴다 — 대신 모듈 레벨
 * pub/sub로 Toaster 컴포넌트에 알림을 전달한다. 구독자가 없으면(Toaster 미마운트) 조용히 무시된다.
 */
export function showToast(input: ToastInput): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    variant: input.variant ?? 'info',
    durationMs: input.durationMs ?? 4000,
    message: input.message,
  }
  listeners.forEach((listener) => listener(toast))
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
