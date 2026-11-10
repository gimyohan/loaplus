import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 라이트 모드 스타일이 아직 다듬어지지 않아 전환 버튼을 임시로 숨긴다 — 다시 보이려면 이 값만
// true로 되돌리면 된다(다크 모드 자체 로직은 App.tsx에 그대로 남아있다).
const SHOW_THEME_TOGGLE = false

export interface TopAppBarProps {
  title: string
  nickname?: string | null
  isDark: boolean
  onToggleDark: () => void
  isSidebarCollapsed: boolean
}

export function TopAppBar({ title, nickname, isDark, onToggleDark, isSidebarCollapsed }: TopAppBarProps) {
  return (
    <header
      className={cn(
        'flex h-12 items-center justify-between border-b border-border bg-background px-4 transition-[margin] duration-200 md:px-8',
        isSidebarCollapsed ? 'md:ml-16' : 'md:ml-[240px]',
      )}
    >
      <div className="hidden md:block">
        <h2 className="text-lg font-black text-white">{title}</h2>
      </div>

      {/* 모바일에서만 보이는 로고 (사이드바가 숨겨지므로) */}
      <h1 className="text-lg font-black text-white md:hidden">LoaPlus</h1>

      <div className="ml-auto flex items-center gap-3">
        {nickname && <span className="hidden text-sm text-muted-foreground sm:block">{nickname}</span>}
        {SHOW_THEME_TOGGLE && (
          <Button variant="outline" size="icon" onClick={onToggleDark} aria-label="테마 전환">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </header>
  )
}
