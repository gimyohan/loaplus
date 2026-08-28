import {
  BarChart3,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import type { NavView } from '@/types/navigation'

// premiumOnly 항목(Market)은 프리미엄이 아닌 유저에게는 아예 목록에서 빠진다 — 접근 자체를
// 프리미엄 전용으로 제한한다는 것을 사이드바에서도 드러낸다(사용자 확정, docs/subscription.typ
// "기능 제한 대상" 참고). 나중에 프리미엄 전용 탭이 늘어나도 이 플래그 하나만 붙이면 된다.
const NAV_ITEMS: { view: NavView; label: string; icon: typeof LayoutDashboard; premiumOnly?: boolean }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'roster', label: 'Roster', icon: Users },
  { view: 'logs', label: 'Logs', icon: ScrollText },
  { view: 'statistics', label: 'Statistics', icon: BarChart3 },
  { view: 'market', label: 'Market', icon: TrendingUp, premiumOnly: true },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export interface SidebarProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
  onSignOut: () => void
  isPremium: boolean
}

export function Sidebar({ activeView, onNavigate, onSignOut, isPremium }: SidebarProps) {
  const navItems = NAV_ITEMS.filter((item) => !item.premiumOnly || isPremium)

  return (
    <nav className="fixed left-0 top-0 hidden h-full w-[240px] flex-col border-r border-border bg-card px-4 py-6 md:flex">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-primary">LoaPlus</h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Lost Ark Utility</p>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              activeView === view
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <button
          type="button"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HelpCircle className="h-5 w-5" />
          Support
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </nav>
  )
}
