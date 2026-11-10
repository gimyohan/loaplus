import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  ScrollText,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'

import { usePendingHomeworkCounts } from '@/lib/pendingHomework'
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

/** Market(premiumOnly)/Settings(비로그인 숨김) 필터 규칙 — Sidebar/BottomNav가 서로 다른
 * 탭 구성을 갖지 않도록 이 판단도 함께 export해서 공유한다. */
export function visibleNavItems(isPremium: boolean, isAuthenticated: boolean) {
  return NAV_ITEMS.filter(
    (item) => (!item.premiumOnly || isPremium) && (isAuthenticated || item.view !== 'settings'),
  )
}

/** 사이드바 캐릭터 목록 한 줄(슬랙의 채널 행 자리). 대시보드 카드 순서 그대로 넘긴다. */
export interface SidebarCharacterItem {
  id: string
  characterName: string
  imageUrl?: string
}

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
  /** 로그인 상태에서만 넘긴다. 없으면 캐릭터 섹션 자체를 그리지 않는다(미리보기 모드). */
  characters?: SidebarCharacterItem[]
  /** 캐릭터 행 클릭 — 대시보드로 이동해 그 카드로 스크롤한다. */
  onCharacterClick?: (characterId: string) => void
  /** "캐릭터 추가" 행 클릭. 최대 개수에 도달했으면 넘기지 않아 행을 숨긴다. */
  onAddCharacter?: () => void
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
  characters,
  onCharacterClick,
  onAddCharacter,
}: SidebarProps) {
  const navItems = visibleNavItems(isPremium, isAuthenticated)
  const pendingCounts = usePendingHomeworkCounts()

  // Slack 톤 사이드바 항목: 28px 높이의 촘촘한 행, 활성 항목은 짙은 파랑 면 + 흰 굵은 글씨.
  const itemClass = (active = false) =>
    cn(
      'flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[15px] transition-colors',
      isCollapsed && 'justify-center px-0',
      active
        ? 'bg-primary-strong font-bold text-primary-foreground'
        : 'text-sidebar-foreground/75 hover:bg-white/[0.06] hover:text-sidebar-foreground',
    )

  return (
    <nav
      className={cn(
        'fixed left-0 top-0 hidden h-full flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex',
        isCollapsed ? 'w-16' : 'w-[240px]',
      )}
    >
      {/* 헤더 행은 TopAppBar와 같은 높이(h-12)로 맞춰 두 바의 아래 경계선이 한 줄로 이어지게 한다.
          접힘/펼침 모두 같은 행 높이를 유지해 아래 항목이 밀리지 않는다. */}
      <div
        className={cn(
          'flex h-12 shrink-0 items-center border-b border-border',
          isCollapsed ? 'justify-center px-2' : 'justify-between gap-2 pl-4 pr-3',
        )}
      >
        {!isCollapsed && <h1 className="min-w-0 truncate text-lg font-black text-white">LoaPlus</h1>}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-white/[0.08] hover:text-sidebar-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto py-3', isCollapsed ? 'px-2' : 'px-2.5')}>
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            onClick={() => onNavigate(view)}
            aria-label={label}
            aria-current={activeView === view ? 'page' : undefined}
            className={itemClass(activeView === view)}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {!isCollapsed && <span className="truncate">{label}</span>}
          </button>
        ))}

        {characters && (
          // 슬랙의 채널 목록 자리. 미완료 숙제가 있는 캐릭터는 슬랙의 "안 읽은 채널"처럼 굵고 밝게,
          // 다 끝낸 캐릭터는 흐리게 보여주고, 개수는 오른쪽 뱃지로 띄운다(lib/pendingHomework.ts).
          <section aria-label="캐릭터" className="mt-5 flex flex-col gap-0.5">
            {!isCollapsed && (
              <h2 className="mb-1 px-3 text-[13px] font-bold text-sidebar-foreground/60">캐릭터</h2>
            )}
            {characters.map((character) => {
              const pending = pendingCounts[character.id] ?? 0
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => onCharacterClick?.(character.id)}
                  aria-label={pending > 0 ? `${character.characterName}, 미완료 숙제 ${pending}개` : character.characterName}
                  title={isCollapsed ? character.characterName : undefined}
                  className={cn(
                    'relative flex h-8 w-full items-center gap-2.5 rounded-lg px-3 text-[15px] transition-colors hover:bg-white/[0.06]',
                    isCollapsed && 'justify-center px-0',
                    pending > 0
                      ? 'font-bold text-white'
                      : 'text-sidebar-foreground/60 hover:text-sidebar-foreground',
                  )}
                >
                  <CharacterAvatar name={character.characterName} imageUrl={character.imageUrl} />
                  {!isCollapsed && <span className="min-w-0 flex-1 truncate text-left">{character.characterName}</span>}
                  {pending > 0 &&
                    (isCollapsed ? (
                      <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-danger ring-2 ring-sidebar" />
                    ) : (
                      <span className="ml-auto min-w-[20px] shrink-0 rounded-full bg-danger px-1.5 text-center text-xs font-bold leading-5 text-white">
                        {pending}
                      </span>
                    ))}
                </button>
              )
            })}
            {onAddCharacter && (
              <button type="button" onClick={onAddCharacter} aria-label="캐릭터 추가" className={itemClass()}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.08]">
                  <Plus className="h-3.5 w-3.5" />
                </span>
                {!isCollapsed && <span className="truncate">캐릭터 추가</span>}
              </button>
            )}
          </section>
        )}
      </div>

      <div className={cn('flex flex-col gap-0.5 border-t border-border py-3', isCollapsed ? 'px-2' : 'px-2.5')}>
        {isAuthenticated && (
          <button type="button" aria-label="Support" className={itemClass()}>
            <HelpCircle className="h-[18px] w-[18px] shrink-0" />
            {!isCollapsed && 'Support'}
          </button>
        )}
        {isAuthenticated ? (
          <button type="button" onClick={onSignOut} aria-label="Sign Out" className={itemClass()}>
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!isCollapsed && 'Sign Out'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            aria-label="로그인"
            className={cn(
              'flex h-8 w-full items-center gap-2.5 rounded-lg bg-secondary-strong px-3 text-[15px] font-bold text-secondary-foreground transition-colors hover:bg-secondary-strong/90',
              isCollapsed && 'justify-center px-0',
            )}
          >
            <LogIn className="h-[18px] w-[18px] shrink-0" />
            {!isCollapsed && '로그인'}
          </button>
        )}
        <p className="pt-2 text-center text-[10px] text-sidebar-foreground/50">v{__APP_VERSION__}</p>
      </div>
    </nav>
  )
}

/** 캐릭터 행의 20px 아바타. 이미지가 없으면 이름 첫 글자로 대신한다. 캐릭터 이미지는 전신 일러스트라
 * 얼굴 쪽(위)이 보이도록 위 기준으로 자른다. */
function CharacterAvatar({ name, imageUrl }: { name: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-5 w-5 shrink-0 rounded-md bg-white/[0.08] object-cover object-top"
        loading="lazy"
      />
    )
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-[11px] font-bold">
      {name.slice(0, 1)}
    </span>
  )
}
