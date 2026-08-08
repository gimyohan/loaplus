import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'

const GAUGE_MARKS = [0, 20, 40, 60, 80, 100]

// 슬라이더 thumb 크기(h-4 w-4 = 16px). 트랙 양 끝은 thumb 반지름(8px)만큼 안쪽으로 밀려서
// 움직이므로, 아래 마크 라벨도 같은 만큼 보정해야 실제 thumb 위치와 정확히 겹친다.
const THUMB_SIZE_PX = 16

// TODO: 실제로는 캐릭터가 진행 가능한 쿠르잔 전선 단계 목록을 백엔드에서 받아와야 한다.
// 배열의 첫 번째 항목이 캐릭터가 갈 수 있는 가장 높은 목표(기본 값)다.
const TARGET_OPTIONS = ['네프타 작전 1', '아비도스 3 작전', '아비도스 2 작전', '아비도스 1 작전']

export interface KurzanFrontlineSettingsModalProps {
  open: boolean
  onClose: () => void
  characterName: string
  data: KurzanFrontlineSummary
  onSave: (next: KurzanFrontlineSummary) => void
}

/**
 * 쿠르잔 전선 위젯의 톱니바퀴를 누르면 뜨는 설정 모달. 휴식 게이지를 직접 조절하고
 * 진행할 목표(전선 단계)를 고를 수 있다.
 */
export function KurzanFrontlineSettingsModal({
  open,
  onClose,
  characterName,
  data,
  onSave,
}: KurzanFrontlineSettingsModalProps) {
  const [restGauge, setRestGauge] = useState(data.restGauge)
  const [targetName, setTargetName] = useState(data.targetName)

  useEffect(() => {
    if (open) {
      setRestGauge(data.restGauge)
      setTargetName(data.targetName)
    }
  }, [open, data])

  const percent = Math.round((restGauge / data.restGaugeMax) * 100)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ ...data, restGauge, targetName })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`${characterName}의 위젯 설정`} className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">휴식 게이지 조절</h3>
            <span className="rounded bg-muted px-2 py-1 font-mono text-xs text-secondary">
              현재: {percent}%
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted p-4">
            <input
              type="range"
              min={0}
              max={data.restGaugeMax}
              step={data.restGaugeMax / 10}
              value={restGauge}
              onChange={(event) => setRestGauge(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white"
              style={{
                background: `linear-gradient(to right, rgb(var(--primary)) 0%, rgb(var(--secondary)) ${percent}%, rgb(var(--border)) ${percent}%)`,
              }}
            />
            <div className="relative h-3">
              {GAUGE_MARKS.map((mark) => (
                <span
                  key={mark}
                  className={cn(
                    'absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground',
                    mark === percent && 'font-bold text-secondary',
                  )}
                  style={{
                    left: `calc(${THUMB_SIZE_PX / 2}px + (100% - ${THUMB_SIZE_PX}px) * ${mark / 100})`,
                  }}
                >
                  {mark}%
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">목표 설정</h3>
          <div className="flex flex-col gap-1.5">
            {TARGET_OPTIONS.map((option, index) => (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-3 transition-colors',
                  targetName === option
                    ? 'border-primary bg-muted'
                    : 'border-border bg-card hover:bg-muted',
                )}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="targetName"
                    checked={targetName === option}
                    onChange={() => setTargetName(option)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span
                    className={cn(
                      'text-sm',
                      targetName === option ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {option}
                  </span>
                </span>
                {/* 목록의 첫 항목 = 캐릭터가 갈 수 있는 가장 높은 목표 */}
                {index === 0 && (
                  <span className="shrink-0 rounded bg-background px-2 py-1 font-mono text-[10px] text-primary">
                    기본 값
                  </span>
                )}
              </label>
            ))}
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
