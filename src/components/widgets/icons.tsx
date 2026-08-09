import { cn } from '@/lib/utils'

export interface MaskIconProps {
  className?: string
}

/**
 * public/ 디렉토리의 재화 아이콘(흰색 실루엣 SVG)을 CSS mask로 불러온다. 파일 내용을 그대로
 * 참조하므로 이후 아이콘을 다시 교체해도 코드 수정 없이 반영되고, mask는 currentColor(bg-current)를
 * 사용하므로 다른 아이콘처럼 hover/다크·라이트 모드 색상에 맞춰 변한다.
 */
function createMaskIcon(src: string) {
  return function MaskIcon({ className }: MaskIconProps) {
    return (
      <span
        aria-hidden="true"
        className={cn('inline-block bg-current', className)}
        style={{
          maskImage: `url(${src})`,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'contain',
          WebkitMaskImage: `url(${src})`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'contain',
        }}
      />
    )
  }
}

export const ShardIcon = createMaskIcon('/편린_icon.svg')
export const ResonancePotionIcon = createMaskIcon('/공명의_비약_icon.svg')
export const AzenaBlessingIcon = createMaskIcon('/아제나의_축복_icon.svg')
