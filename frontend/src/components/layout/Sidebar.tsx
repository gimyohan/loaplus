import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogIn,
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
  isPremium: boolean
  isCollapsed: boolean
  onToggleCollapsed: () => void
  /** false면 로그인 전 미리보기 모드다 — Settings/Support를 숨기고 하단 버튼이 로그아웃 대신
   * 로그인으로 동작한다(사용자 확정). */
  isAuthenticated: boolean
  onSignOut?: () => void
  onLoginClick?: () => void
}

export function Sidebar({
  activeView,
  onNavigate,
  isPremium,
  isCollapsed,
  onToggleCollapsed,
  isAuthenticated,
  onSignOut,
  onLoginClick,
}: SidebarProps) {
  const navItems = NAV_ITEMS.filter(
    (item) => (!item.premiumOnly || isPremium) && (isAuthenticated || item.view !== 'settings'),
  )

  return (
    <nav
      className={cn(
        'fixed left-0 top-0 hidden h-full flex-col border-r border-border bg-card py-6 transition-[width] duration-200 md:flex',
        isCollapsed ? 'w-16 px-2' : 'w-[240px] px-4',
      )}
    >
      {/* 접혔을 때 로고 자리를 없애 로고+버튼이 세로로 쌓이지 않게 한다 — 그러면 이 헤더 블록
          높이가 펼친 상태보다 커져서 아래 네비 아이템들이 그만큼 밀려 내려가 버린다(사용자 확인).
          펼침/접힘 모두 한 줄(row) 높이를 유지하도록 버튼만 남기고 정렬만 바꾸되, "LoaPlus" 텍스트
          줄높이와 버튼(h-6) 높이가 서로 달라 그 차이만큼 여전히 미세하게 밀리므로, h-8로 고정해
          두 상태의 행 높이 자체를 아예 동일하게 맞춘다. */}
      <div className={cn('mb-8 flex h-8 items-center', isCollapsed ? 'justify-center' : 'justify-between gap-2')}>
        {!isCollapsed && <h1 className="min-w-0 text-xl font-bold text-primary">LoaPlus</h1>}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            aria-label={label}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isCollapsed && 'justify-center px-0',
              activeView === view
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        {isAuthenticated && (
          <button
            type="button"
            aria-label="Support"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isCollapsed && 'justify-center px-0',
            )}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            {!isCollapsed && 'Support'}
          </button>
        )}
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign Out"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              isCollapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isCollapsed && 'Sign Out'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            aria-label="로그인"
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10',
              isCollapsed && 'justify-center px-0',
            )}
          >
            <LogIn className="h-5 w-5 shrink-0" />
            {!isCollapsed && '로그인'}
          </button>
        )}
      </div>
    </nav>
  )
}
