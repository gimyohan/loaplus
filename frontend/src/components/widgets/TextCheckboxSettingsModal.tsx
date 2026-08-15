import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

// 백엔드/문서 계약과 값을 그대로 맞춘다 — docs/db_schema.typ의 Dashboard_Widgets
// "resetDays는 7비트 요일 비트마스크" 참고 (비트 i = 그 날짜의 getUTCDay() 값 i, 0=일~6=토).
export type TextCheckboxResetDays = number

export const RESET_DAYS_OFF: TextCheckboxResetDays = 0
export const RESET_DAYS_ALL: TextCheckboxResetDays = 0b1111111 // 전 요일 ("매일")

const WEDNESDAY_BIT = 1 << 3 // 수요일 하나만 ("매주" — 이 서비스의 주간 경계, docs/reset_logic.typ 참고)
const TUESDAY_BIT = 1 << 2 // "특별"로 전환할 때 예시로 켜는 요일 하나(끄기/매일/매주에서 넘어올 때만)

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

type RepeatOption = 'off' | 'daily' | 'weekly' | 'special'

const REPEAT_OPTIONS: { value: RepeatOption; label: string }[] = [
  { value: 'off', label: '끄기' },
  { value: 'daily', label: '매일' },
  { value: 'weekly', label: '매주' },
  { value: 'special', label: '특별' },
]

/** 요일 비트마스크 → 반복 옵션. 끄기/매일/매주는 각각 정확히 하나의 비트마스크에만 대응하고, 그 외
 * 모든 조합(요일 하나만 골랐는데 수요일이 아니거나, 둘 이상을 고른 경우)은 "특별"이다. */
function computeRepeatOption(resetDays: TextCheckboxResetDays): RepeatOption {
  if (resetDays === RESET_DAYS_OFF) return 'off'
  if (resetDays === RESET_DAYS_ALL) return 'daily'
  if (resetDays === WEDNESDAY_BIT) return 'weekly'
  return 'special'
}

/** 반복 옵션 버튼을 직접 눌렀을 때의 요일 비트마스크. "특별"은 그 자체로는 정해진 요일 조합이
 * 없으므로, 이미 특별 상태면 그대로 두고 끄기/매일/매주에서 전환하는 경우에만 화요일 하나를
 * 예시로 켠다 — 사용자가 이어서 원하는 요일로 직접 조정하면 된다. */
function resetDaysForRepeatOption(
  option: RepeatOption,
  currentResetDays: TextCheckboxResetDays,
): TextCheckboxResetDays {
  if (option === 'off') return RESET_DAYS_OFF
  if (option === 'daily') return RESET_DAYS_ALL
  if (option === 'weekly') return WEDNESDAY_BIT
  return computeRepeatOption(currentResetDays) === 'special' ? currentResetDays : TUESDAY_BIT
}

export interface TextCheckboxSettingsValue {
  text: string
  resetDays: TextCheckboxResetDays
  /** null이면 카운터 기능을 쓰지 않음 */
  remainingCount: number | null
}

export interface TextCheckboxSettingsModalProps {
  open: boolean
  onClose: () => void
  text: string
  resetDays: TextCheckboxResetDays
  remainingCount: number | null
  onSave: (value: TextCheckboxSettingsValue) => void
}

/**
 * 텍스트 · 체크박스 위젯의 설정 모달 — 할 일 텍스트, 반복(체크박스 자동 초기화) 요일, 반복 횟수
 * 카운터를 여기서 한 번에 편집한다(docs/widgets.typ 참고). 텍스트는 더 이상 카드에서 직접 입력하지
 * 않고 이 모달에서만 편집한다.
 */
export function TextCheckboxSettingsModal({
  open,
  onClose,
  text,
  resetDays,
  remainingCount,
  onSave,
}: TextCheckboxSettingsModalProps) {
  const { user } = useAuth()
  const [textValue, setTextValue] = useState(text)
  const [days, setDays] = useState(resetDays)
  const [isCounterEnabled, setIsCounterEnabled] = useState(remainingCount !== null)
  const [counterValue, setCounterValue] = useState(remainingCount ?? 1)

  useEffect(() => {
    if (!open) return
    setTextValue(text)
    setDays(resetDays)
    setIsCounterEnabled(remainingCount !== null)
    setCounterValue(remainingCount ?? 1)
  }, [open, text, resetDays, remainingCount])

  const repeatOption = computeRepeatOption(days)

  const toggleDay = (dayIndex: number) => {
    setDays((prev) => prev ^ (1 << dayIndex))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({
      text: textValue,
      resetDays: days,
      remainingCount: isCounterEnabled ? Math.max(0, Math.trunc(counterValue)) : null,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${user?.nickname ?? '사용자'}의 텍스트 체크박스 설정`}
      className="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="text-checkbox-text" className="text-sm font-medium text-foreground">
            할 일
          </label>
          <input
            id="text-checkbox-text"
            type="text"
            autoFocus
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder="할 일을 입력하세요"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">반복 옵션</h3>
          <div className="grid grid-cols-4 gap-1 rounded-lg border border-border p-1">
            {REPEAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={option.value === repeatOption}
                onClick={() => setDays(resetDaysForRepeatOption(option.value, days))}
                className={cn(
                  'rounded-md px-2 py-2 text-center text-sm transition-colors',
                  option.value === repeatOption
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map((label, index) => {
              const isOn = (days & (1 << index)) !== 0
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isOn}
                  aria-label={`${label}요일`}
                  onClick={() => toggleDay(index)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors',
                    isOn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">반복 횟수 카운터</h3>
            <button
              type="button"
              role="switch"
              aria-checked={isCounterEnabled}
              aria-label="반복 횟수 카운터"
              onClick={() => setIsCounterEnabled((prev) => !prev)}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                isCounterEnabled ? 'bg-primary' : 'bg-border',
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  isCounterEnabled && 'translate-x-5',
                )}
              />
            </button>
          </div>

          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border border-border p-2 transition-opacity',
              !isCounterEnabled && 'pointer-events-none opacity-50',
            )}
          >
            <label htmlFor="text-checkbox-counter" className="text-xs text-muted-foreground">
              남은 횟수
            </label>
            <input
              id="text-checkbox-counter"
              type="number"
              min={0}
              disabled={!isCounterEnabled}
              value={counterValue}
              onChange={(event) => setCounterValue(Math.max(0, Math.trunc(Number(event.target.value) || 0)))}
              className="w-20 rounded-md border border-border bg-background px-2 py-1 text-right font-mono text-sm text-foreground disabled:cursor-not-allowed"
            />
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  )
}
