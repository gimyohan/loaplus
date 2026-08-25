// public/class_icon/ 안의 클래스 아이콘(흰색 실루엣)을 직업명으로 찾기 위한 매핑.
// 발키리/차원술사/환수사만 파일이 webp이고 나머지는 전부 svg다(public/class_icon/ 실제 파일 목록 기준).
const WEBP_CLASSES = new Set(['발키리', '차원술사', '환수사'])

const CLASS_NAMES = [
  '가디언나이트',
  '건슬링어',
  '기공사',
  '기상술사',
  '데모닉',
  '데빌헌터',
  '도화가',
  '디스트로이어',
  '리퍼',
  '바드',
  '발키리',
  '배틀마스터',
  '버서커',
  '브레이커',
  '블래스터',
  '블레이드',
  '서머너',
  '소서리스',
  '소울이터',
  '스카우터',
  '스트라이커',
  '슬레이어',
  '아르카나',
  '워로드',
  '인파이터',
  '차원술사',
  '창술사',
  '호크아이',
  '홀리나이트',
  '환수사',
] as const

export const CLASS_ICON_MAP: Partial<Record<string, string>> = Object.fromEntries(
  CLASS_NAMES.map((name) => [name, `/class_icon/${name}.${WEBP_CLASSES.has(name) ? 'webp' : 'svg'}`]),
)
