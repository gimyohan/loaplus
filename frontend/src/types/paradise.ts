// docs/widgets.typ - 낙원(Paradise) 위젯: 주간 컨텐츠 상태(천상 스택/지옥 열쇠)를 기록
export interface ParadiseSummary {
  /** 천상 스택(티켓) 보유 수 */
  ticketCount: number
  /** 지옥 열쇠 보유 수 */
  keyCount: number
  /** 매주 초기화 시점에 티켓/열쇠를 자동으로 채울지 여부 (설정 모달에서 토글) */
  autoRecharge: boolean
}
