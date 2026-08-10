import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const MAX_COLUMNS = 30
const MAX_ROWS = 60

export interface GridSettingsModalProps {
  open: boolean
  onClose: () => void
  columns: number
  rows: number
  /** 이미 배치된 위젯을 가리지 않기 위한 최소 칸 수 (docs/overview.typ: n x m 그리드) */
  minColumns: number
  minRows: number
  onResize: (columns: number, rows: number) => void
  /** 위젯 목록 + 배치 편집기 (WidgetDashboard에서 전달) */
  children: ReactNode
}

/**
 * 위젯 설정 모달. 그리드 칸 수 조정과 위젯 배치 편집(목록 + 드래그 앤 드롭)을 한 곳에서 다룬다.
 * 메인 화면에는 완성된 배치만 보여주고, 편집은 모두 이 모달 안에서 이루어진다.
 */
export function GridSettingsModal({
  open,
  onClose,
  columns,
  rows,
  minColumns,
  minRows,
  onResize,
  children,
}: GridSettingsModalProps) {
  const [columnsInput, setColumnsInput] = useState(columns)
  const [rowsInput, setRowsInput] = useState(rows)

  useEffect(() => {
    if (open) {
      setColumnsInput(columns)
      setRowsInput(rows)
    }
  }, [open, columns, rows])

  const handleResize = (event: FormEvent) => {
    event.preventDefault()
    onResize(clamp(columnsInput, minColumns, MAX_COLUMNS), clamp(rowsInput, minRows, MAX_ROWS))
  }

  return (
    <Modal open={open} onClose={onClose} title="위젯 설정" className="max-w-7xl">
      <div className="flex flex-col gap-6">
        <form onSubmit={handleResize} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">가로 칸 수</span>
            <input
              type="number"
              min={minColumns}
              max={MAX_COLUMNS}
              value={columnsInput}
              onChange={(event) => setColumnsInput(Number(event.target.value))}
              className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">세로 칸 수</span>
            <input
              type="number"
              min={minRows}
              max={MAX_ROWS}
              value={rowsInput}
              onChange={(event) => setRowsInput(Number(event.target.value))}
              className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>

          <Button type="submit">그리드 크기 적용</Button>

          <p className="w-full text-xs text-muted-foreground">
            이미 배치된 위젯을 가리지 않도록 최소 {minColumns}×{minRows} 칸 이상이어야 합니다.
          </p>
        </form>

        <div className="border-t border-border pt-6">{children}</div>
      </div>
    </Modal>
  )
}
