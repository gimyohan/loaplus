type Listener = () => void

const listenersByCharacterId = new Map<string, Set<Listener>>()

/**
 * 대시보드의 가디언/쿠르잔 전선 위젯이 Logs 탭에서 일어난 되돌리기를 알아챌 수 있도록 하는
 * 최소한의 pub/sub. 두 화면이 서로 다른 컴포넌트 트리에 있고(App.tsx에서 hidden으로만 숨겨질 뿐
 * 언마운트되지 않음) 각자 독립적으로 상태를 들고 있어서, 전체를 Context로 묶는 대신 캐릭터 단위로만
 * "다시 조회해" 신호를 보낸다.
 */
export function subscribeHomeworksChanged(characterId: string, listener: Listener): () => void {
  let listeners = listenersByCharacterId.get(characterId)
  if (!listeners) {
    listeners = new Set()
    listenersByCharacterId.set(characterId, listeners)
  }
  listeners.add(listener)

  return () => {
    listeners!.delete(listener)
    if (listeners!.size === 0) {
      listenersByCharacterId.delete(characterId)
    }
  }
}

export function notifyHomeworksChanged(characterId: string): void {
  listenersByCharacterId.get(characterId)?.forEach((listener) => listener())
}
