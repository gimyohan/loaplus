import { Minus, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import guardianRaidTargets from '@/data/guardianRaidTargets.json'
import { cn } from '@/lib/utils'
import type { GuardianSummary } from '@/types/guardian'

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

export interface GuardianSettingsModalProps {
  open: boolean
  onClose: () => void
  characterName: string
  /** 캐릭터의 현재 아이템 레벨. 이 레벨로 입장 가능한 가디언만 목록에 노출한다 */
  characterItemLevel: number
  data: GuardianSummary
  onSave: (next: GuardianSummary) => void
}

/**
 * 가디언 위젯의 톱니바퀴를 누르면 뜨는 설정 모달. 휴식 게이지를 직접 조절하고,
 * 쿠르잔 전선과 달리 가디언은 단계가 자동으로 진행되지 않으므로 대상 가디언도 직접 고른다.
 * 목록은 임시로 채워둔 값이며(docs/widgets.typ - 가디언), 추후 더 추가될 예정이다.
 * 실제 가디언은 20종이 넘으므로, 캐릭터 레벨로 입장 가능한 것만 걸러 입장 레벨 내림차순으로
 * 정렬하고 스크롤 목록으로 보여준다 — 펼쳐진 pill 목록은 개수가 늘어나면 감당이 안 된다.
 */
export function GuardianSettingsModal({
  open,
  onClose,
  characterName,
  characterItemLevel,
  data,
  onSave,
}: GuardianSettingsModalProps) {
  const [targetName, setTargetName] = useState(data.targetName)
  const [restGauge, setRestGauge] = useState(data.restGauge)
  const [threshold, setThreshold] = useState(data.restGaugeThreshold)

  const availableTargets = guardianRaidTargets.targets
    .filter((target) => target.minItemLevel <= characterItemLevel)
    .sort((a, b) => b.minItemLevel - a.minItemLevel)

  useEffect(() => {
    if (open) {
      setTargetName(data.targetName)
      setRestGauge(data.restGauge)
      setThreshold(data.restGaugeThreshold)
    }
  }, [open, data])

  const step = data.restGaugeMax / 10
  const percent = Math.round((restGauge / data.restGaugeMax) * 100)
  const thresholdPercent = Math.round((threshold / data.restGaugeMax) * 100)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({ ...data, targetName, restGauge, restGaugeThreshold: threshold })
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

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">대상 가디언</h3>
          {availableTargets.length > 0 ? (
            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
              {availableTargets.map((target) => (
                <button
                  key={target.name}
                  type="button"
                  aria-pressed={target.name === targetName}
                  onClick={() => setTargetName(target.name)}
                  className={cn(
                    'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors',
                    target.name === targetName
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span>{target.name}</span>
                  <span className="font-mono text-xs opacity-70">Lv.{target.minItemLevel}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              현재 아이템 레벨({characterItemLevel})로 입장 가능한 가디언이 없습니다
            </p>
          )}
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
