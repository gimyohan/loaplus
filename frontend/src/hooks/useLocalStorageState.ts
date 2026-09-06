import { useCallback, useState } from 'react'

/**
 * localStorage에 값을 자동으로 저장/복원하는 useState — 다른 탭으로 옮겼다 돌아와 컴포넌트가
 * 다시 마운트돼도(App.tsx는 activeView가 바뀌면 대시보드를 제외한 탭을 언마운트한다) 마지막
 * 값이 유지된다. JSON으로 직렬화하므로 문자열/숫자/배열/객체 어디에나 쓸 수 있다. 읽기/쓰기가
 * 실패해도(프라이빗 브라우징 등으로 접근이 막힌 경우) 조용히 기본값/무시로 동작한다 — 이 상태는
 * 편의 기능일 뿐이라 없어도 앱이 정상 동작해야 한다(market.ts의 관심 목록 저장과 같은 원칙).
 */
export function useLocalStorageState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  // useCallback으로 참조를 고정한다 — 호출부(예: GoldTrendSection)가 이 setter를 effect의
  // 의존성 배열에 안전하게 넣을 수 있어야, "매 렌더 새 함수라 deps 경고를 억지로 끈다" 같은
  // 편법 없이 정직하게 의존성을 선언할 수 있다.
  const setPersistedValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // 저장 실패(용량 초과, 접근 차단 등)는 조용히 무시한다.
        }
        return resolved
      })
    },
    [key],
  )

  return [value, setPersistedValue] as const
}
