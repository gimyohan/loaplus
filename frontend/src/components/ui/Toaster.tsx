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
            // animate-toast-in: 등장할 때 살짝 떠오르며 페이드인 — 정적으로 툭 나타나기만 하면
            // 우측 하단이라 시선을 못 끈다. border-2 + ring + shadow로 카드 배경과의 대비도 키웠다.
            'animate-toast-in relative flex items-start gap-2.5 overflow-hidden rounded-lg border-2 bg-card p-4 text-sm shadow-2xl ring-1 ring-black/5',
            toast.variant === 'warning' ? 'border-amber-500' : 'border-primary/70',
          )}
        >
          {toast.variant === 'warning' ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          )}
          <p className="font-medium leading-relaxed text-foreground">{toast.message}</p>
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
