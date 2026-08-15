import { useEffect, useState } from 'react'

import { LoginScreen } from '@/components/auth/LoginScreen'
import { DashboardView } from '@/components/dashboard/DashboardView'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopAppBar } from '@/components/layout/TopAppBar'
import { LogsView } from '@/components/logs/LogsView'
import { RosterView } from '@/components/roster/RosterView'
import { SettingsView } from '@/components/settings/SettingsView'
import { StatisticsView } from '@/components/statistics/StatisticsView'
import { ConfirmModal } from '@/components/ui/confirmModal'
import { Toaster } from '@/components/ui/Toaster'
import { useAuth } from '@/contexts/AuthContext'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { fetchCardOrder } from '@/lib/dashboards'
import { cn } from '@/lib/utils'
import type { NavView } from '@/types/navigation'

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Roster Dashboard',
  roster: 'Roster',
  logs: 'Logs',
  statistics: 'Statistics',
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
  // 귀속된 카드(실제 캐릭터) 삭제는 되돌릴 수 없어 확인 모달을 띄운다. 아직 이름을 검색하지
  // 않은 임시 카드는 서버에 아무 것도 없으니 확인 없이 바로 지운다.
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; characterName: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

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
      if (prev.includes(characterId)) {
        // 이미 다른 카드에 귀속된 캐릭터를 또 검색한 경우 — 그대로 교체하면 같은 characterId가
        // 배열에 두 번 들어가 React key가 중복되고(카드 삭제가 엉뚱하게 동작하는 원인), 그 카드는
        // 이미 다른 자리에 떠 있으므로 이 임시 카드는 그냥 없앤다.
        return prev.filter((cardId) => cardId !== id)
      }
      return prev.map((cardId) => (cardId === id ? characterId : cardId))
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        onAddCharacter={() => {
          setCardIds((prev) => [...(prev ?? []), crypto.randomUUID()])
          setActiveView('dashboard')
        }}
        onSignOut={() => logout()}
      />
      <TopAppBar
        title={VIEW_TITLES[activeView]}
        nickname={user?.nickname}
        isDark={isDark}
        onToggleDark={() => setIsDark((v) => !v)}
      />

      <main
        className={cn(
          'px-4 pb-12 pt-24 md:ml-[240px] md:px-8',
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
            <DashboardView cardIds={cardIds} onRemoveCard={handleRemoveCard} onCardBound={handleCardBound} />
          )}
        </div>
        {activeView === 'logs' && <LogsView />}
        {activeView === 'roster' && <RosterView onRosterChanged={refreshCardOrder} />}
        {activeView === 'statistics' && <StatisticsView />}
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
