import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { LoginScreen } from '@/components/auth/LoginScreen'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopAppBar } from '@/components/layout/TopAppBar'
import { LogsView } from '@/components/logs/LogsView'
import { MarketView } from '@/components/market/MarketView'
import { RosterView } from '@/components/roster/RosterView'
import { SettingsView } from '@/components/settings/SettingsView'
import { StatisticsView } from '@/components/statistics/StatisticsView'
import { ConfirmModal } from '@/components/ui/confirmModal'
import { Toaster } from '@/components/ui/Toaster'
import { useAuth } from '@/contexts/AuthContext'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { fetchCardOrder } from '@/lib/dashboards'
import { cn } from '@/lib/utils'
import { fetchProfile } from '@/lib/user'
import type { NavView } from '@/types/navigation'

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Roster Dashboard',
  roster: 'Roster',
  logs: 'Logs',
  statistics: 'Statistics',
  market: 'Market',
  settings: 'Settings',
}

function App() {
  const { status, user, logout } = useAuth()
  const { characters, isLoading: isCharacterDirectoryLoading, remove } = useCharacterDirectory()
  const [isDark, setIsDark] = useState(true)
  const [activeView, setActiveView] = useState<NavView>('dashboard')
  // 실제로 등록된 카드는 characterId 그 자체다(GET /api/dashboards). "Add Character"로 막 추가한,
  // 아직 이름을 검색하지 않은 카드만 임시로 클라이언트 uuid를 쓰다가 귀속되는 순간 characterId로
  // 교체된다(onCardBound). null이면 초기 순서를 아직 불러오는 중.
  const [cardIds, setCardIds] = useState<string[] | null>(null)
  // Add Character로 막 추가한 카드의 id. 그 카드가 마운트되자마자 위젯 설정 모달을 자동으로 열어주기
  // 위한 신호로만 쓰인다 — 카드는 항상 새 uuid로(React key도 새로) 마운트되므로 굳이 나중에
  // 초기화하지 않아도 이후 다른 카드가 이 값과 잘못 일치할 일은 없다.
  const [autoOpenCardId, setAutoOpenCardId] = useState<string | null>(null)
  // 귀속된 카드(실제 캐릭터) 삭제는 되돌릴 수 없어 확인 모달을 띄운다. 아직 이름을 검색하지
  // 않은 임시 카드는 서버에 아무 것도 없으니 확인 없이 바로 지운다.
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; characterName: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  // 대시보드는 탭을 옮겨도 언마운트되지 않지만(위 hidden 처리 참고), 다른 탭 콘텐츠가 같은
  // <main> 안에 그려지면서 문서 높이가 바뀌어 스크롤 위치 자체는 유지되지 않는다 — 다른 탭으로
  // 나갈 때 스크롤 위치를 기억해뒀다가, 대시보드로 돌아왔을 때만 복원한다(새로고침 시엔 사라지는
  // 임시 기억이라 상태로 두지 않고 ref로 충분하다).
  const dashboardScrollY = useRef(0)
  // Market 탭 노출 여부(사이드바)와 접근 권한(MarketView 자체 게이트) 둘 다 이 값 하나로
  // 판단한다 — null(조회 전)이면 우선 숨겨둔다(fail-closed, 잠깐이라도 비프리미엄 유저에게
  // 노출되지 않도록). docs/subscription.typ "기능 제한 대상" 참고.
  const [isPremium, setIsPremium] = useState<boolean | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetchProfile()
      .then((profile) => {
        if (!cancelled) setIsPremium(profile.isPremium)
      })
      .catch((err) => {
        console.error('프로필 조회 실패', err)
        if (!cancelled) setIsPremium(false)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetchCardOrder()
      .then((order) => {
        if (!cancelled) setCardIds(order)
      })
      .catch((err) => {
        console.error('카드 순서 조회 실패', err)
        if (!cancelled) setCardIds([])
      })
    return () => {
      cancelled = true
    }
  }, [status])

  // 대시보드에서 나가기 직전(handleNavigate)에 스크롤 위치를 저장해둔다 — effect cleanup에서
  // 저장하면 그 시점엔 이미 다른 탭의(대개 더 짧은) 레이아웃으로 DOM이 바뀐 뒤라 window.scrollY가
  // 브라우저에 의해 이미 0 근처로 잘려 있어 늦다. 대시보드로 들어올 때는(이 effect) 반대로
  // 대시보드 콘텐츠가 다시 보이는 화면 갱신 뒤에 복원해야 하므로, 레이아웃 반영 직후·그리기 전에
  // 맞추는 useLayoutEffect를 쓴다.
  useLayoutEffect(() => {
    if (activeView === 'dashboard') {
      window.scrollTo(0, dashboardScrollY.current)
    }
  }, [activeView])

  // RosterView(원정대 일괄 추가, 카드 순서 드래그 스왑) 등 이 상태 밖에서 캐릭터가 새로
  // 등록되거나 순서가 바뀌었을 때, 대시보드 탭에도 반영되도록 순서를 다시 불러온다.
  const refreshCardOrder = () => {
    fetchCardOrder()
      .then(setCardIds)
      .catch((err) => console.error('카드 순서 조회 실패', err))
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Toaster />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <>
        <LoginScreen />
        <Toaster />
      </>
    )
  }

  const handleRemoveCard = (id: string) => {
    const boundCharacter = characters.find((character) => character.id === id)
    if (!boundCharacter) {
      // 아직 검색으로 귀속되지 않은 임시 카드 — 서버에 아무 것도 없으니 그냥 목록에서 지운다.
      setCardIds((prev) => prev?.filter((cardId) => cardId !== id) ?? prev)
      return
    }

    // 귀속된 카드는 곧 실제 캐릭터라, 삭제하면 가디언/쿠르잔 전선/낙원 상태와 로그·통계까지
    // 함께 영구히 삭제된다(docs/api.typ 캐릭터 삭제 참고) — 되돌릴 수 없는 작업이라 먼저 확인받는다.
    setPendingRemoval({ id, characterName: boundCharacter.characterName })
  }

  const confirmRemoveCard = () => {
    if (!pendingRemoval) return
    const { id } = pendingRemoval
    setIsRemoving(true)
    remove(id)
      .then(() => {
        setCardIds((prev) => prev?.filter((cardId) => cardId !== id) ?? prev)
        setPendingRemoval(null)
      })
      .catch((err) => console.error('캐릭터 삭제 실패', err))
      .finally(() => setIsRemoving(false))
  }

  const handleCardBound = (id: string, characterId: string) => {
    setCardIds((prev) => {
      if (!prev) return prev
      if (id === characterId) {
        // 이미 이 characterId로 귀속된 카드가 같은 이름을 다시 적용한 경우(예: 입력창에서 Enter로
        // 재제출) — 바뀌는 게 없으니 그대로 둔다. 이 검사 없이 아래 "이미 다른 카드에 귀속된
        // 캐릭터" 처리로 넘어가면 자기 자신과 충돌한 것으로 판정돼 카드가 통째로 사라져버린다.
        return prev
      }
      if (prev.includes(characterId)) {
        // 이미 다른 카드에 귀속된 캐릭터를 또 검색한 경우 — 그대로 교체하면 같은 characterId가
        // 배열에 두 번 들어가 React key가 중복되고(카드 삭제가 엉뚱하게 동작하는 원인), 그 카드는
        // 이미 다른 자리에 떠 있으므로 이 임시 카드는 그냥 없앤다.
        return prev.filter((cardId) => cardId !== id)
      }
      return prev.map((cardId) => (cardId === id ? characterId : cardId))
    })
    // 이 카드가 Add Character로 막 추가돼 자동으로 설정 모달이 열려 있던 카드였다면(autoOpenCardId
    // === id), 위 id → characterId 교체로 React key가 바뀌어 WidgetDashboard가 새로 마운트되면서
    // isSettingsOpen 로컬 상태가 초기화돼 모달이 닫혀버린다 — autoOpenCardId도 같이 새 id를
    // 가리키도록 옮겨두면, 새로 마운트되는 인스턴스가 다시 autoOpenSettings=true로 열려서 사용자
    // 눈에는 모달이 계속 열려 있던 것처럼 보인다.
    setAutoOpenCardId((prev) => (prev === id ? characterId : prev))
  }

  const handleNavigate = (next: NavView) => {
    if (activeView === 'dashboard' && next !== 'dashboard') {
      dashboardScrollY.current = window.scrollY
    }
    setActiveView(next)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onSignOut={() => logout()}
        isPremium={isPremium ?? false}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
      />
      <TopAppBar
        title={VIEW_TITLES[activeView]}
        nickname={user?.nickname}
        isDark={isDark}
        onToggleDark={() => setIsDark((v) => !v)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <main
        className={cn(
          // 상단 탭 제목 바(TopAppBar)가 더 이상 fixed가 아니라 문서 흐름 안에 있으므로(사용자
          // 확정: 스크롤해도 안 붙어있게), 예전엔 그 고정 높이(h-16)만큼 비워두던 pt-24를
          // 그 여백분(pt-8)만으로 줄인다.
          'px-4 pb-12 pt-8 transition-[margin] duration-200 md:px-8',
          isSidebarCollapsed ? 'md:ml-16' : 'md:ml-[240px]',
          // 대시보드 탭은 카드가 화면 오른쪽까지 꽉 차게 배치되도록 폭 제한을 풀고, 나머지
          // 탭(표/글 위주 화면)은 가독성을 위해 기존 1200px 중앙 정렬을 유지한다. 여기서 폭을
          // 아예 지정하지 않아야(width: auto) 사이드바의 md:ml-[240px] 마진만큼을 브라우저가
          // 알아서 빼고 계산한다 — w-full(width: 100%)을 쓰면 마진이 빠지지 않아 240px만큼
          // 오버플로우되고, 그 늘어난 폭 그대로 카드 크기 계산에 들어가 카드가 커지고 가로
          // 스크롤이 생긴다.
          activeView !== 'dashboard' && 'mx-auto max-w-[1200px]',
        )}
      >
        {/* 탭을 옮겨도 카드에 귀속된 캐릭터/위젯 배치가 유지되도록 언마운트 대신 숨김 처리한다 */}
        <div className={activeView === 'dashboard' ? undefined : 'hidden'}>
          {cardIds === null || isCharacterDirectoryLoading ? (
            // 카드 순서(characterId 배열)만 먼저 도착하고 캐릭터 목록이 아직이면, 이미 귀속된
            // 카드도 initialCharacterName 없이 마운트돼버려 위젯 배치를 못 받아온다 — 그 값은
            // 최초 마운트 시에만 쓰이므로 나중에 목록이 도착해도 스스로 고쳐지지 않는다. 그래서
            // 두 조회가 모두 끝난 뒤에만 그린다.
            <p className="py-24 text-center text-sm text-muted-foreground">불러오는 중...</p>
          ) : (
            <DashboardView
              cardIds={cardIds}
              autoOpenCardId={autoOpenCardId}
              onRemoveCard={handleRemoveCard}
              onCardBound={handleCardBound}
              onAddCharacter={() => {
                const newId = crypto.randomUUID()
                setCardIds((prev) => [...(prev ?? []), newId])
                setAutoOpenCardId(newId)
              }}
            />
          )}
        </div>
        {activeView === 'logs' && <LogsView />}
        {activeView === 'roster' && <RosterView onRosterChanged={refreshCardOrder} />}
        {activeView === 'statistics' && <StatisticsView />}
        {activeView === 'market' && <MarketView isPremium={isPremium ?? false} />}
        {activeView === 'settings' && <SettingsView />}
      </main>

      <ConfirmModal
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={confirmRemoveCard}
        title="카드 삭제"
        message={`${pendingRemoval?.characterName} 카드를 삭제하면 가디언/쿠르잔 전선/낙원 진행 상태와 로그·통계가 함께 삭제됩니다. 계속할까요?`}
        isConfirming={isRemoving}
      />

      <Toaster />
    </div>
  )
}

export default App
