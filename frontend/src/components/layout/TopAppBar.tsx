import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

export interface TopAppBarProps {
  title: string
  nickname?: string | null
  isDark: boolean
  onToggleDark: () => void
}

export function TopAppBar({ title, nickname, isDark, onToggleDark }: TopAppBarProps) {
  return (
    <header className="fixed right-0 top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-background px-4 md:w-[calc(100%-240px)] md:px-8">
      <div className="hidden md:block">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>

      {/* 모바일에서만 보이는 로고 (사이드바가 숨겨지므로) */}
      <h1 className="text-lg font-bold text-primary md:hidden">LoaPlus</h1>

      <div className="ml-auto flex items-center gap-3">
        {nickname && <span className="hidden text-sm text-muted-foreground sm:block">{nickname}</span>}
        <Button variant="outline" size="icon" onClick={onToggleDark} aria-label="테마 전환">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
