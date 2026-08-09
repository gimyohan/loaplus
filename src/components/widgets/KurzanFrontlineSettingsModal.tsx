import { Minus, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import type { KurzanFrontlineSummary } from '@/types/kurzanFrontline'

const GAUGE_MARKS = [0, 20, 40, 60, 80, 100]

// 슬라이더 thumb 크기(h-4 w-4 = 16px). 트랙 양 끝은 thumb 반지름(8px)만큼 안쪽으로 밀려서
// 움직이므로, 마크/임계치 마커도 같은 만큼 보정해야 실제 thumb 위치와 정확히 겹친다.
const THUMB_SIZE_PX = 16

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

/** 트랙 좌표 계산에 쓰이는 공통 공식 (thumb 인셋 보정) */
function trackPosition(percent: number) {
  return `calc(${THUMB_SIZE_PX / 2}px + (100% - ${THUMB_SIZE_PX}px) * ${percent / 100})`
}

export interface KurzanFrontlineSettingsModalProps {
  open: boolean
  onClose: () => void
  characterName: string
  data: KurzanFrontlineSummary
  onSave: (next: KurzanFrontlineSummary) => void
}

/**
 * 쿠르잔 전선 위젯의 톱니바퀴를 누르면 뜨는 설정 모달. 휴식 게이지를 직접 조절한다.
 * 진행할 목표(전선 단계)는 항상 최고 단계로 자동 진행하므로 별도로 고를 필요가 없다.
 */
export function KurzanFrontlineSettingsModal({
  open,
  onClose,
  characterName,
  data,
  onSave,
}: KurzanFrontlineSettingsModalProps) {
  const [restGauge, setRestGauge] = useState(data.restGauge)
  const [threshold, setThreshold] = useState(data.restGaugeThreshold)

  useEffect(() => {
    if (open) {
      setRestGauge(data.restGauge)
      setThreshold(data.restGaugeThreshold)
    }
  }, [open, data])

  const step = data.restGaugeMax / 10
  const percent = Math.round((restGauge / data.restGaugeMax) * 100)
  const thresholdPercent = Math.round((threshold / data.restGaugeMax) * 100)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ ...data, restGauge, restGaugeThreshold: threshold })
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
            {/* 트랙 위에 임계치 마커를 겹쳐 그리므로 relative 래퍼가 필요하다 */}
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={data.restGaugeMax}
                step={step}
                value={restGauge}
                onChange={(event) => setRestGauge(Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white"
                style={{
                  background: `linear-gradient(to right, rgb(var(--primary)) 0%, rgb(var(--secondary)) ${percent}%, rgb(var(--border)) ${percent}%)`,
                }}
              />
              {/* 임계치 마커: 별도 슬라이더 대신 같은 트랙 위의 기준선으로 표시 */}
              <div
                className="pointer-events-none absolute h-4 w-0.5 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_1.5px_rgb(var(--muted))]"
                style={{ left: trackPosition(thresholdPercent) }}
              />
            </div>
            <div className="relative h-3">
              {GAUGE_MARKS.map((mark) => (
                <span
                  key={mark}
                  className={cn(
                    'absolute -translate-x-1/2 font-mono text-[10px] text-muted-foreground',
                    mark === percent && 'font-bold text-secondary',
                  )}
                  style={{ left: trackPosition(mark) }}
                >
                  {mark}%
                </span>
              ))}
            </div>

            {/* 임계치는 게이지와 같은 축 위의 기준점이므로, 슬라이더를 하나 더 두지 않고
                위 마커 + 숫자 스테퍼로만 조절한다 */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-0.5 rounded-full bg-foreground" aria-hidden="true" />
                임계치
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="임계치 감소"
                  onClick={() => setThreshold((prev) => clamp(prev - step, 0, data.restGaugeMax))}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-10 text-center font-mono text-xs text-foreground">
                  {thresholdPercent}%
                </span>
                <button
                  type="button"
                  aria-label="임계치 증가"
                  onClick={() => setThreshold((prev) => clamp(prev + step, 0, data.restGaugeMax))}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
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
