import { useEffect, useId, useSyncExternalStore } from 'react'

/**
 * 사이드바 캐릭터 목록의 "미완료 숙제" 뱃지용 저장소(슬랙의 안 읽음 개수 자리).
 *
 * 숙제 상태는 각 위젯이 이미 들고 있으므로(가디언/쿠르잔/할의 모래시계/레이드/루틴), 위젯이 자기
 * 상태를 여기에 "보고"하고 사이드바는 캐릭터별 합계만 읽는다. 그래서
 * - 실제로 카드에 배치된 위젯만 센다(배치 안 한 숙제는 뱃지에 안 잡힘).
 * - 체크박스를 누르는 즉시 뱃지가 바뀐다(위젯 상태가 곧 출처라 따로 재조회하지 않음).
 * 대시보드는 다른 탭으로 가도 언마운트되지 않으므로(App.tsx) 데스크톱에선 보고가 계속 유지된다.
 *
 * 같은 숙제를 두 인스턴스가 동시에 그릴 수 있다(예: 배치 편집 모달 미리보기, 같은 위젯 중복 배치).
 * 그래서 보고는 인스턴스별로 따로 저장하고, 셀 때 (캐릭터, key) 단위로 중복을 없앤다.
 */

interface PendingEntry {
  characterId: string
  key: string
  pending: boolean
}

const entries = new Map<string, PendingEntry>()
const listeners = new Set<() => void>()
let snapshot: Record<string, number> = {}

function recompute() {
  const keysByCharacter = new Map<string, Set<string>>()
  for (const entry of entries.values()) {
    if (!entry.pending) continue
    let keys = keysByCharacter.get(entry.characterId)
    if (!keys) {
      keys = new Set()
      keysByCharacter.set(entry.characterId, keys)
    }
    keys.add(entry.key)
  }
  const next: Record<string, number> = {}
  for (const [characterId, keys] of keysByCharacter) next[characterId] = keys.size
  snapshot = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 위젯이 자기 숙제 상태를 보고한다. pending이 null이면(아직 불러오는 중, 목표 미설정 등) 보고하지
 * 않는다. key를 생략하면 인스턴스마다 고유한 key를 쓴다(레이드·루틴처럼 위젯 하나가 숙제 하나인 경우).
 * 가디언처럼 캐릭터당 하나뿐인 숙제는 고정 key를 넘겨 중복 배치돼도 1개로 세게 한다.
 */
export function useReportPendingHomework(characterId: string | undefined, pending: boolean | null, key?: string) {
  const instanceId = useId()
  const resolvedKey = key ?? instanceId

  useEffect(() => {
    if (!characterId || pending === null) return
    entries.set(instanceId, { characterId, key: resolvedKey, pending })
    recompute()
    return () => {
      entries.delete(instanceId)
      recompute()
    }
  }, [instanceId, characterId, resolvedKey, pending])
}

/** 캐릭터 id → 미완료 숙제 개수. 0개인 캐릭터는 키 자체가 없다. */
export function usePendingHomeworkCounts(): Record<string, number> {
  return useSyncExternalStore(subscribe, () => snapshot)
}
