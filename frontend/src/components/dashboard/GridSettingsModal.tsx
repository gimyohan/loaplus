import type { ReactNode } from 'react'

import { Modal } from '@/components/ui/modal'

export interface GridSettingsModalProps {
  open: boolean
  onClose: () => void
  /** 캐릭터 지정 + 배치 코드 + 위젯 순서 목록 + 위젯 목록 (WidgetDashboard에서 전달) */
  children: ReactNode
}

/** 카드 한 장의 위젯 설정 모달 — 위젯 추가/삭제와 순서 변경을 다룬다. */
export function GridSettingsModal({ open, onClose, children }: GridSettingsModalProps) {
  return (
    // align="start": 순서 목록+위젯 목록+배치 코드 패널을 합치면 세로로 뷰포트보다 길어질 때가 많다.
    // 기본(center) 정렬이면 넘치는 높이가 위아래로 반씩 걸쳐 상단이 화면 밖으로 잘려 보이고,
    // 그 과정에서 배경 오버레이가 아니라 페이지 자체에 스크롤이 생기는 문제가 있었다 — 상단을
    // 고정하고 아래로만 늘어나게 하면 늘 모달 맨 위부터 보이고 스크롤도 모달 안에서만 일어난다.
    <Modal open={open} onClose={onClose} title="위젯 설정" className="max-w-4xl" align="start">
      {children}
    </Modal>
  )
}
