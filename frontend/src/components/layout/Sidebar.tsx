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

const NAV_ITEMS: { view: NavView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'roster', label: 'Roster', icon: Users },
  { view: 'logs', label: 'Logs', icon: ScrollText },
  { view: 'statistics', label: 'Statistics', icon: BarChart3 },
  { view: 'market', label: 'Market', icon: TrendingUp },
  { view: 'settings', label: 'Settings', icon: Settings },
]

export interface SidebarProps {
  activeView: NavView
  onNavigate: (view: NavView) => void
  onSignOut: () => void
}

export function Sidebar({ activeView, onNavigate, onSignOut }: SidebarProps) {
  return (
    <nav className="fixed left-0 top-0 hidden h-full w-[240px] flex-col border-r border-border bg-card px-4 py-6 md:flex">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-primary">LoaPlus</h1>
        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Lost Ark Utility</p>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
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
