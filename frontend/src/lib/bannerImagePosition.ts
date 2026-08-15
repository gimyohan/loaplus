export interface BannerImagePosition {
  /** 캐릭터 초상화(Open API CharacterImage, 원본 612x708) 안에서 얼굴 중심의 가로 위치. 0=이미지 왼쪽 끝, 100=오른쪽 끝. */
  faceX: number
  /** 캐릭터 초상화 안에서 얼굴 중심의 세로 위치. 0=이미지 위쪽 끝, 100=아래쪽 끝. */
  faceY: number
}

/**
 * 배너에서 초상화를 얼마나 확대해서 보여줄지 (컨테이너 가로 폭 기준 %).
 * 값을 키울수록 얼굴이 크게/타이트하게 잡히고 faceX/faceY 조정 범위도 넓어지지만,
 * 너무 크면 머리카락 위쪽이나 턱 아래가 잘릴 수 있다. CharacterBanner.tsx에서 실제
 * 캐릭터로 확인하며 조정한 값.
 */
export const BANNER_ZOOM_PERCENT = 108

/** 지금까지 튜닝 안 한 근본 클래스가 쓰는 기본값.*/
const DEFAULT_POSITION: BannerImagePosition = { faceX: 300, faceY: 19 }

// 캐릭터 초상화 안에서 얼굴이 위치하는 자리가 근본 클래스별로 달라서 (총 11개 근본 클래스),
// 그룹 단위로 얼굴 중심 좌표를 따로 튜닝한다. 아직 튜닝 안 한 근본 클래스는 DEFAULT_POSITION을
// 그대로 쓴다 — 실제 캐릭터로 확인하며 하나씩 추가해나간다.
//
// 값을 새로 넣거나 고칠 때: 캐릭터의 imageUrl(원본 초상화, 612x708)을 이미지 뷰어로 열어서
// 얼굴 중심이 왼쪽에서 몇 %, 위에서 몇 % 지점인지 읽으면 그대로 faceX/faceY에 넣으면 된다.
const BASE_CLASS_GROUPS: Record<string, readonly string[]> = {
  전사: ['디스트로이어', '워로드', '버서커', '홀리나이트'],
  전사_여: ['슬레이어', '발키리'],
  무도가: ['배틀마스터', '인파이터', '기공사', '창술사'],
  무도가_남: ['스트라이커', '브레이커'],
  헌터: ['데빌헌터', '블래스터', '호크아이', '스카우터'],
  헌터_여: ['건슬링어'],
  마법사: ['바드', '서머너', '아르카나', '소서리스'],
  암살자: ['데모닉', '블레이드', '리퍼', '소울이터'],
  스페셜리스트: ['도화가', '기상술사', '환수사'],
  스페셜리스트_남: ['차원술사'],
  가디언나이트: ['가디언나이트'],
}

const BASE_CLASS_POSITIONS: Record<string, BannerImagePosition> = {
  전사: { faceX: 300, faceY: 8 },
  전사_여: { faceX: 300, faceY: 12 },
  무도가: { faceX: 300, faceY: 18 },
  무도가_남: { faceX: 300, faceY: 14 },
  헌터: { faceX: 300, faceY: 14 },
  헌터_여: { faceX: 300, faceY: 16 },
  마법사: { faceX: 300, faceY: 14 },
  암살자: { faceX: 300, faceY: 16 },
  스페셜리스트: { faceX: 300, faceY: 32 },
  스페셜리스트_남: { faceX: 300, faceY: 28 },
  가디언나이트: { faceX: 300, faceY: 16 },
}

const CLASS_NAME_TO_BASE_CLASS: Record<string, string> = Object.fromEntries(
  Object.entries(BASE_CLASS_GROUPS).flatMap(([baseClass, classNames]) =>
    classNames.map((className) => [className, baseClass]),
  ),
)

export function getBannerImagePosition(className: string): BannerImagePosition {
  const baseClass = CLASS_NAME_TO_BASE_CLASS[className]
  return (baseClass && BASE_CLASS_POSITIONS[baseClass]) || DEFAULT_POSITION
}
