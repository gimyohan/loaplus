import { useState } from 'react'

import { DEFAULT_COLUMNS, DEFAULT_ROWS, WidgetDashboard } from '@/components/dashboard/WidgetDashboard'
import { ScaleToFit } from '@/components/dashboard/ScaleToFit'
import { useCharacterDirectory } from '@/contexts/CharacterDirectoryContext'
import { CELL_SIZE } from '@/lib/widgetCatalog'
import { cn } from '@/lib/utils'

/** 카드 하나의 원본(native) 가로 픽셀 크기 — 가로 칸 수(DEFAULT_COLUMNS)는 고정이라 항상 같다. */
export const CARD_NATIVE_WIDTH = DEFAULT_COLUMNS * CELL_SIZE
/** 세로 칸 수(rows)를 아직 모를 때(카드가 막 마운트되어 서버 조회 전) 쓰는 기본 높이. */
export const CARD_NATIVE_HEIGHT = DEFAULT_ROWS * CELL_SIZE

export interface DashboardCardProps {
  /** 이미 실제 캐릭터에 귀속된 카드라면 그 캐릭터 이름. 없으면 아직 검색으로 귀속 전인 새 카드. */
  initialCharacterName?: string
  onRemove: () => void
  /** 위젯 팔레트의 이름 검색으로 실제 캐릭터에 (처음) 귀속되면 그 characterId를 알려준다. */
  onBound: (characterId: string) => void
  /** 이 카드가 실제로 차지할 픽셀 너비. 생략하면 원본 크기(CARD_NATIVE_WIDTH) 그대로 그린다. */
  width?: number
  className?: string
}

/**
 * 대시보드 카드 그리드의 칸 하나. 위젯 그리드(WidgetDashboard)는 항상 고정 가로 칸 수
 * (CARD_NATIVE_WIDTH)로 그려지지만 세로 칸 수(높이)는 캐릭터별 설정에 따라 다를 수 있다 — 실제
 * 그 값은 WidgetDashboard가 서버에서 조회하므로, onRowsChange로 여기 올려받아 카드의 원본 높이로
 * 쓴다. 한 줄에 몇 개를 배치하느냐(DashboardView 참고)에 따라 카드 전체를 ScaleToFit으로 통째로
 * 축소/확대한다 — 위젯 하나하나를 그리드 칸 크기에 맞춰 스케일하는 것과 같은 방식을 카드 단위로
 * 한 번 더 적용한 것. 배치 편집 모달(GridSettingsModal)은 별도 portal(document.body)로
 * 렌더링되어 이 스케일의 영향을 받지 않고 항상 원본 크기로 열린다.
 */
export function DashboardCard({ initialCharacterName, onRemove, onBound, width, className }: DashboardCardProps) {
  const { findByName } = useCharacterDirectory()
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const nativeHeight = rows * CELL_SIZE
  const targetWidth = width ?? CARD_NATIVE_WIDTH
  const targetHeight = (targetWidth / CARD_NATIVE_WIDTH) * nativeHeight

  return (
    <ScaleToFit
      nativeWidth={CARD_NATIVE_WIDTH}
      nativeHeight={nativeHeight}
      width={targetWidth}
      height={targetHeight}
      className={cn('shrink-0', className)}
    >
      <WidgetDashboard
        initialCharacterName={initialCharacterName}
        onRemove={onRemove}
        onCharacterNameChange={(name) => {
          const record = name ? findByName(name) : undefined
          if (record) onBound(record.id)
        }}
        onRowsChange={setRows}
      />
    </ScaleToFit>
  )
}
