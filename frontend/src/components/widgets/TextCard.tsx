import { useEffect, useState } from 'react'

import { TextWidget } from '@/components/widgets/TextWidget'
import { cn } from '@/lib/utils'
import type { WidgetCardProps } from '@/types/widget'

export function TextCard({
  width,
  height,
  disabledClassName,
  className,
  customData,
  onCustomDataChange,
}: WidgetCardProps) {
  // 입력 중엔 로컬 상태로만 부드럽게 반영하고, 포커스가 벗어날 때만 onCustomDataChange로
  // 저장한다(키 입력마다 API를 부르지 않기 위함). customData?.text의 "값"만 의존성으로 둬서,
  // 저장 후 돌아오는 동일한 값으로는 다시 리셋되지 않게 한다.
  const [textDraft, setTextDraft] = useState((customData?.text as string) ?? '')
  useEffect(() => {
    setTextDraft((customData?.text as string) ?? '')
  }, [customData?.text])

  // 다른 위젯과 달리 ScaleToFit을 쓰지 않는다 — 텍스트 위젯은 가로 칸 수(w)를 사용자가 자유롭게
  // 고를 수 있어(WidgetPalette의 CatalogCard 참고) native 비율(5:1)과 실제 배치 비율이 달라질 수
  // 있는데, ScaleToFit은 폭 기준 배율을 안쪽 콘텐츠 전체(폰트 포함)에 균일하게 곱하므로 폭이
  // 커질수록 글자도 같이 커지고(넓은 위젯일수록 폰트가 커짐) 좁으면 거의 안 보일 만큼 작아지는
  // 문제가 있었다. 실제 픽셀 크기 그대로 그리면 폰트는 항상 고정이고 폭만 넓어진다 — 대신
  // DashboardCard(카드 전체)가 이미 바깥에서 한 번 더 ScaleToFit을 걸고 있으므로(반응형 축소),
  // 화면 크기에 따라 줄어드는 동작 자체는 그대로 유지된다.
  return (
    <div style={{ width, height }} className={cn('select-none', disabledClassName, className)}>
      <TextWidget
        value={textDraft}
        onChange={setTextDraft}
        onBlur={() => onCustomDataChange?.({ text: textDraft })}
        className="h-full w-full"
      />
    </div>
  )
}
