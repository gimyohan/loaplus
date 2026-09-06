import type { NavView } from '@/types/navigation'

export interface ScreenshotPair {
  /** public/screenshots/ 아래 정적 파일 경로. 지금은 자리표시(placeholder) 이미지다 — 실제
   * 스크린샷 파일로 교체하면 그대로 반영된다. */
  src: string
  description: string
}

/** 로그인 전 사이드바 탭을 눌렀을 때 보여줄 스크린샷+설명 쌍. 탭(Dashboard/Roster/Logs/
 * Statistics)마다 완전히 독립된 배열이라, 한 탭의 쌍 개수·내용을 바꿔도 다른 탭에는 영향이
 * 없다(사용자 확인). Market/Settings는 로그인 전 사이드바 자체에 노출되지 않으므로 없다. */
export const PREVIEW_SCREENSHOTS: Record<Exclude<NavView, 'market' | 'settings'>, ScreenshotPair[]> = {
  dashboard: [
    { src: '/screenshots/dashboard-main.png', description: '캐릭터별로 가디언/쿠르잔 전선/레이드/루틴을 한 카드에서 관리합니다.' },
    { src: '/screenshots/dashboard-mobile.png', description: '모바일 화면에서 하나의 캐릭터를 집중적으로 관리할 수 있습니다.' },
    { src: '/screenshots/dashboard-setting.png', description: '카드마다 원하는 위젯을 자유롭게 배치해 나만의 대시보드를 꾸밀 수 있습니다.' },
  ],
  roster: [
    { src: '/screenshots/roster-list.png', description: '등록한 캐릭터 카드의 순서를 드래그로 바꿀 수 있습니다.' },
    { src: '/screenshots/roster-add.png', description: '원정대 전체를 조회해 아직 등록 안 한 캐릭터를 한 번에 추가할 수 있습니다.' },
  ],
  logs: [
    { src: '/screenshots/logs-list.png', description: '가디언/쿠르잔 전선 수확 등 모든 진행 기록이 자동으로 쌓입니다.' },
    { src: '/screenshots/logs-delete.png', description: '실수로 체크한 기록은 버튼 하나로 되돌릴 수 있습니다.' },
  ],
  statistics: [
    { src: '/screenshots/statistics-flow.png', description: '주차별 골드 획득 추이를 캐릭터별/합산으로 확인할 수 있습니다.' },
    { src: '/screenshots/statistics-pie.png', description: '레이드·가디언·쿠르잔 등 컨텐츠별 골드 비중을 한눈에 볼 수 있습니다.' },
  ],
}
