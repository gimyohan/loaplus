import { AlertTriangle, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { subscribeToasts, type Toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

/** 화면 우측 하단에 잠깐 떴다 사라지는 전역 알림. 특정 화면에 속하지 않으므로 App.tsx에 한 번만 마운트한다. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev, toast])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, toast.durationMs)
    })
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            'relative flex items-start gap-2.5 overflow-hidden rounded-lg border bg-card p-3.5 text-sm shadow-2xl',
            toast.variant === 'warning' ? 'border-amber-500/40' : 'border-border',
          )}
        >
          {toast.variant === 'warning' ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <p className="leading-relaxed text-foreground">{toast.message}</p>
          {/* 자동으로 사라지기까지 남은 시간 표시 — 왼쪽에서 시작해 durationMs 동안 줄어든다. */}
          <div
            className={cn(
              'animate-toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left',
              toast.variant === 'warning' ? 'bg-amber-500' : 'bg-primary',
            )}
            style={{ animationDuration: `${toast.durationMs}ms` }}
          />
        </div>
      ))}
    </div>,
    document.body,
  )
}
