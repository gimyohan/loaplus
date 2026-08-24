// docs/widgets.typ - 할의 모래시계(Hal's Hourglass) 위젯. 레벨은 캐릭터 아이템 레벨로 자동
// 산정되며(가디언/쿠르잔 전선의 target_auto_managed와 같은 규칙), 유저가 직접 바꾸는 기능은 없다.
export interface HalHourglassSummary {
  level: string
  /** 시련의 모래 스택. 0~5, 완료 처리 시에만 0으로 소진된다(주간 경계와 무관) */
  sandStack: number
  /** 이번 주 완료 여부. 매주 수요일 06:00 KST에 초기화된다 */
  isCompleted: boolean
}
