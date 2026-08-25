import { useCallback, useRef, useState } from 'react'

/**
 * 엘리먼트의 실시간 너비(px)를 재는 훅. 카드 그리드처럼 컨테이너 너비에 맞춰 카드 크기를
 * 계산해야 하는 반응형 레이아웃에 쓴다. 창 크기 변경뿐 아니라 사이드바 유무 등 레이아웃
 * 자체가 바뀌는 경우도 잡아내기 위해 window resize 대신 ResizeObserver를 쓴다.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0)
  const observerRef = useRef<ResizeObserver | null>(null)

  // 콜백 ref로 만든 이유: 대시보드처럼 같은 컴포넌트가 조건부로 다른 엘리먼트를 그리는 경우
  // (모바일 캐러셀 ↔ 데스크톱 그리드), 이 ref가 붙는 실제 DOM 노드가 리마운트 없이도 바뀐다.
  // useRef+빈 deps 이펙트로는 최초 마운트 시점 노드 하나만 관찰하고 끝나버려서, 최초 렌더가
  // 모바일이었거나 그 뒤 노드가 교체되면 새 노드를 영영 관찰하지 못해 너비가 0에 고정되는
  // 버그가 있었다 — 콜백 ref는 React가 노드를 붙이거나 뗄 때마다 매번 호출해주므로 그때그때
  // 관찰 대상을 다시 잡을 수 있다.
  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect()
    observerRef.current = null

    if (!node) return

    setWidth(node.getBoundingClientRect().width)
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const next = entry.contentRect.width
      // 조상이 display:none이 되면(탭 전환으로 대시보드 컨테이너가 hidden 처리되는 경우 등)
      // ResizeObserver가 폭을 0으로 보고한다 — 그 0을 그대로 반영하면 이 값에 기대는 조건부
      // 렌더링(예: DashboardView의 `containerWidth > 0 && ...`)이 자식을 통째로 언마운트했다가
      // 다시 보일 때 전부 새로 마운트해버려, 이미 불러온 위젯 배치를 매번 API로 다시 조회하고
      // 로컬 편집 상태(열려 있던 모달 등)도 잃는다. 실제로 폭이 0인 레이아웃은 사실상 없으므로,
      // 0으로 관측되면 무시하고 마지막으로 잰 양수 값을 그대로 유지한다 — 다시 보이면
      // ResizeObserver가 실제 폭으로 다시 알려준다.
      if (next > 0) setWidth(next)
    })
    observer.observe(node)
    observerRef.current = observer
  }, [])

  return { ref, width }
}
