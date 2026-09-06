import { visibleNavItems } from '@/components/layout/Sidebar'
import { cn } from '@/lib/utils'
import type { NavView } from '@/types/navigation'

export interface BottomNavProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
  isPremium: boolean
  isAuthenticated: boolean
}

/**
 * 모바일(md 미만) 전용 하단 탭바. Sidebar는 `hidden md:flex`라 모바일에서는 아예 렌더링되지
 * 않아, 이 바 없이는 모바일에서 대시보드 밖의 다른 탭(Roster/Logs/Statistics/Market/Settings)으로
 * 이동할 방법이 전혀 없었다(사용자 확인) — Sidebar와 같은 NAV_ITEMS/필터 규칙을 그대로 재사용해
 * 두 네비게이션의 탭 구성이 어긋나지 않게 한다.
 */
export function BottomNav({ activeView, onNavigate, isPremium, isAuthenticated }: BottomNavProps) {
  const navItems = visibleNavItems(isPremium, isAuthenticated)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {navItems.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          onClick={() => onNavigate(view)}
          aria-label={label}
          aria-current={activeView === view ? 'page' : undefined}
          className={cn(
            'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
            activeView === view ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  )
}
