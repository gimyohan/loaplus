export interface OptimisticOptions {
  /** 실패 시 revertUpdate로 되돌릴지. 기본 true — 대부분의 경우 켜두는 게 안전하다(이 저장소엔
   * 실패를 나중에 조용히 바로잡아줄 백그라운드 재동기화가 없어서, 꺼두면 실패가 화면에 영영
   * 안 드러날 수 있다). */
  revertOnFailure?: boolean
  /** 성공 시 reconcileUpdate로 서버 응답을 다시 반영할지. 기본 true — 서버가 클라이언트가 보낸
   * 값을 그대로 저장만 하는 게 아니라 자기 저장값 기준으로 다시 계산하는 필드(카운터 등)라면
   * 꺼서는 안 된다. 순수 저장 필드처럼 낙관적 추측이 항상 서버 결과와 같을 게 보장될 때만
   * 꺼서 불필요한 리렌더를 줄인다. */
  reconcileOnSuccess?: boolean
  /** 실패 시 console.error에 붙일 설명. 기존 각 핸들러가 쓰던 '체크박스 저장 실패' 같은 문구를
   * 그대로 유지하기 위한 것 — 콘솔에서 여러 위젯의 실패를 구분하는 용도. */
  errorLabel?: string
}

/**
 * 낙관적 UI 공통 절차: optimisticUpdate를 즉시 반영 → apiCall 호출 → (성공 시, 옵션에 따라)
 * reconcileUpdate로 서버 응답을 다시 반영 / (실패 시, 옵션에 따라) revertUpdate로 원래대로.
 *
 * setState/optimisticUpdate/revertUpdate/reconcileUpdate가 전부 "prev => next" 함수형 업데이트
 * 모양인 이유는, 매번 그 시점의 최신 상태를 기준으로 적용돼야 그 사이 다른 부분(예: 배열의 다른
 * 위젯)이 바뀌어도 서로 덮어쓰지 않기 때문이다 — 값을 미리 스냅샷해서 그대로 덮어쓰면, 되돌리거나
 * 재조정하는 순간 그 사이에 생긴 무관한 변경까지 밀어버릴 수 있다. 그래서 이 함수는 "지금 값이
 * 뭐였는지"를 직접 조회하지 않는다 — revertUpdate 자체가 호출부에서 되돌릴 값을 이미 캡처해 온
 * prev => next 함수이므로, 이 함수 안에서는 그걸 그대로 전달만 하면 된다.
 *
 * 두 옵션(revertOnFailure/reconcileOnSuccess) 조합 중 기본값(둘 다 true)이 가장 안전하다 — 위젯
 * 종류마다 다른 이유로 하나씩 꺼야 할 때만(예: apiCall이 응답 본문이 없는 void인 경우
 * reconcileOnSuccess를 꺼야 함) 옵션으로 넘긴다.
 */
export async function runOptimistic<T, R>(
  setState: (updater: (prev: T) => T) => void,
  optimisticUpdate: (prev: T) => T,
  revertUpdate: (prev: T) => T,
  apiCall: () => Promise<R>,
  reconcileUpdate: (response: R) => (prev: T) => T,
  options: OptimisticOptions = {},
): Promise<void> {
  const { revertOnFailure = true, reconcileOnSuccess = true, errorLabel } = options

  setState(optimisticUpdate)
  try {
    const response = await apiCall()
    if (reconcileOnSuccess) setState(reconcileUpdate(response))
  } catch (err) {
    if (errorLabel) console.error(errorLabel, err)
    else console.error(err)
    if (revertOnFailure) setState(revertUpdate)
  }
}
