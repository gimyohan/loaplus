import { decodeTemplateCode } from '@/lib/templateCode'
import type { TemplateLayout } from '@/types/template'

// 새 캐릭터(또는 저장된 배치가 없는 캐릭터)에 제안하는 기본 배치. 각 문자열은 위젯 설정 모달의
// '코드 복사'로 만든 배치 코드(LPT1-...)를 그대로 붙여넣은 것이다(사용자 확인) — 위젯 종류·위치·
// 크기와 그리드 높이만 담고 있으며, 실제로 몇 개의 어떤 위젯을 어디에 둘지는 이 코드가 유일한
// 근거다. 아이템 레벨 구간은 사용자 확정: [1640, 1730) / [1730, ...) — 상한(1800)은 열어둔다,
// 그 위 레벨도 여전히 이 기본 배치를 받아야 자연스럽기 때문이다.
const LOWER_BRACKET_CODE = 'LPT1-eyJjb2x1bW5zIjoxMCwicm93cyI6MTYsIndpZGdldHMiOlt7ImtpbmQiOiJyYWlkIiwieCI6MCwieSI6MTAsInciOjUsImgiOjN9LHsia2luZCI6InJhaWQiLCJ4IjowLCJ5IjoxMywidyI6NSwiaCI6M30seyJraW5kIjoicmFpZCIsIngiOjUsInkiOjEzLCJ3Ijo1LCJoIjozfSx7ImtpbmQiOiJiYW5uZXJEZXRhaWxlZCIsIngiOjAsInkiOjAsInciOjEwLCJoIjo1fSx7ImtpbmQiOiJndWFyZGlhbiIsIngiOjUsInkiOjUsInciOjUsImgiOjN9LHsia2luZCI6Imt1cnphbkZyb250bGluZSIsIngiOjAsInkiOjUsInciOjUsImgiOjN9LHsia2luZCI6ImVib255Q3ViZSIsIngiOjAsInkiOjgsInciOjUsImgiOjJ9LHsia2luZCI6InBhcmFkaXNlIiwieCI6NSwieSI6OCwidyI6NSwiaCI6Mn0seyJraW5kIjoidGV4dENoZWNrYm94IiwieCI6NSwieSI6MTAsInciOjUsImgiOjF9XX0' // TODO: [1640, 1730) 배치 코드로 채워야 함
const UPPER_BRACKET_CODE = 'LPT1-eyJjb2x1bW5zIjoxMCwicm93cyI6MTYsIndpZGdldHMiOlt7ImtpbmQiOiJyYWlkIiwieCI6MCwieSI6MTAsInciOjUsImgiOjN9LHsia2luZCI6InJhaWQiLCJ4IjowLCJ5IjoxMywidyI6NSwiaCI6M30seyJraW5kIjoicmFpZCIsIngiOjUsInkiOjEzLCJ3Ijo1LCJoIjozfSx7ImtpbmQiOiJiYW5uZXJEZXRhaWxlZCIsIngiOjAsInkiOjAsInciOjEwLCJoIjo1fSx7ImtpbmQiOiJndWFyZGlhbiIsIngiOjUsInkiOjUsInciOjUsImgiOjN9LHsia2luZCI6Imt1cnphbkZyb250bGluZSIsIngiOjAsInkiOjUsInciOjUsImgiOjN9LHsia2luZCI6ImVib255Q3ViZSIsIngiOjAsInkiOjgsInciOjUsImgiOjJ9LHsia2luZCI6InBhcmFkaXNlIiwieCI6NSwieSI6OCwidyI6NSwiaCI6Mn0seyJraW5kIjoidGV4dENoZWNrYm94IiwieCI6NSwieSI6MTIsInciOjUsImgiOjF9LHsia2luZCI6ImhhbEhvdXJnbGFzcyIsIngiOjUsInkiOjEwLCJ3Ijo1LCJoIjoyfV19' // TODO: [1730, ...) 배치 코드로 채워야 함

/**
 * itemLevel 구간에 맞는 기본 배치를 반환한다. itemLevel을 모르거나(신규 등록 응답을 아직 못
 * 받았거나 등) 코드가 비어있거나/손상됐으면 null — 호출부는 null이면 빈 배치를 그대로 둔다.
 */
export function pickDefaultLayout(itemLevel: number | undefined): TemplateLayout | null {
  if (itemLevel === undefined) return null
  const code = itemLevel < 1730 ? LOWER_BRACKET_CODE : UPPER_BRACKET_CODE
  if (!code) return null
  return decodeTemplateCode(code)
}
