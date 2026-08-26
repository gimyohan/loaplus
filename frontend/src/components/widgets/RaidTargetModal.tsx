import { useEffect, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import raidCatalogData from '@/data/raidCatalog.json'
import { cn } from '@/lib/utils'

const RAID_CATALOG = raidCatalogData.raids

interface RaidDifficultyOption {
  difficultyKey: string
  difficultyName: string
  minItemLevel: number
}

interface RaidGroupOption {
  raidKey: string
  raidName: string
  difficulties: RaidDifficultyOption[]
}

// 레이드별로 난이도를 묶어둔다 — 아이템 레벨 필터/정렬은 characterItemLevel이 있어야 하므로
// 컴포넌트 안에서 매 렌더마다 다시 계산한다(17개 레이드뿐이라 비용은 무시할 만하다).
const RAID_GROUPS: RaidGroupOption[] = RAID_CATALOG.map((raid) => ({
  raidKey: raid.key,
  raidName: raid.name,
  difficulties: raid.difficulties.map((difficulty) => ({
    difficultyKey: difficulty.key,
    difficultyName: difficulty.name,
    minItemLevel: difficulty.minItemLevel,
  })),
}))

export interface RaidTargetModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** 캐릭터의 현재 아이템 레벨. 이 레벨로 입장 가능한 난이도만 목록에 노출한다 */
  characterItemLevel: number
  /** 이미 다른 위젯이 쓰고 있는 레이드 키 목록(이 모달이 편집 중인 위젯 자신은 제외하고 넘겨야 한다) —
   * 난이도가 달라도 같은 레이드는 중복으로 추가할 수 없어 회색으로 비활성화한다. */
  excludedRaidKeys?: string[]
  /** 넘기면 편집(기존 레이드 위젯의 목표 변경) 모드로, 없으면 신규 생성 모드로 동작한다 */
  initialRaidKey?: string | null
  initialDifficultyKey?: string | null
  /** 이미 완료한 관문이 있어 목표를 바꿀 수 없는 상태(docs/widgets.typ "레이드" 참고) */
  locked?: boolean
  submitLabel?: string
  onConfirm: (raidKey: string, difficultyKey: string) => void
  /** 골드 획득 허용/거부. 목표 변경과 동일하게 완료된 관문이 있으면(locked) 바꿀 수 없고,
   * 그 외에는 별도 토글로 즉시 저장한다(docs/widgets.typ "레이드" 참고). */
  goldRewardEnabled: boolean
  onGoldRewardChange: (enabled: boolean) => void
}

/**
 * 레이드 위젯의 목표(레이드/난이도)를 고르는 모달 — 톱니바퀴로 여는 목표 변경, 또는 방금 추가한
 * 빈 위젯의 최초 설정 둘 다에 쓴다. 레이드는 난이도까지 합치면 50종이 넘어 하나의 평평한 목록으로
 * 보여주면 같은 레이드의 난이도끼리 뿔뿔이 흩어진다 — 레이드 단위로 묶고, 캐릭터 아이템 레벨로
 * 입장 가능한 난이도만 걸러 그룹 내림차순(갈 수 있는 최상위 목표부터 거꾸로)으로 정렬한다.
 * 이미 다른 위젯이 쓰고 있는 레이드는 같은 레이드를 중복으로 못 고르게 회색으로 비활성화한다.
 */
export function RaidTargetModal({
  open,
  onClose,
  title,
  characterItemLevel,
  excludedRaidKeys = [],
  initialRaidKey,
  initialDifficultyKey,
  locked = false,
  submitLabel = '저장',
  onConfirm,
  goldRewardEnabled,
  onGoldRewardChange,
}: RaidTargetModalProps) {
  const groups = RAID_GROUPS.map((group) => ({
    ...group,
    // 그룹 안에서는 쉬운 난이도(싱글 → 노말 → 하드)가 앞에 오도록 오름차순으로 둔다.
    difficulties: group.difficulties
      .filter((difficulty) => difficulty.minItemLevel <= characterItemLevel)
      .sort((a, b) => a.minItemLevel - b.minItemLevel),
  }))
    .filter((group) => group.difficulties.length > 0)
    // 그룹 사이의 순서는 그 그룹에서 갈 수 있는 가장 어려운(최상위) 난이도 기준 내림차순 — 난이도가
    // 오름차순이라 배열의 마지막 원소가 그룹의 최상위 목표다.
    .sort((a, b) => {
      const bestA = a.difficulties[a.difficulties.length - 1]!.minItemLevel
      const bestB = b.difficulties[b.difficulties.length - 1]!.minItemLevel
      return bestB - bestA
    })

  // 빈 위젯을 처음 설정할 땐 아무 것도 미리 골라두지 않는다 — 사용자가 직접 하나를 골라야 저장할 수 있다.
  const [raidKey, setRaidKey] = useState(initialRaidKey ?? '')
  const [difficultyKey, setDifficultyKey] = useState(initialDifficultyKey ?? '')

  useEffect(() => {
    if (!open) return
    setRaidKey(initialRaidKey ?? '')
    setDifficultyKey(initialDifficultyKey ?? '')
  }, [open, initialRaidKey, initialDifficultyKey])

  const handleSelect = (targetRaidKey: string, targetDifficultyKey: string, isExcluded: boolean) => {
    if (locked || isExcluded) return
    setRaidKey(targetRaidKey)
    setDifficultyKey(targetDifficultyKey)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (locked || !raidKey || !difficultyKey) return
    onConfirm(raidKey, difficultyKey)
  }

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {locked && (
          <p className="rounded-lg border border-dashed border-border bg-muted p-3 text-xs text-muted-foreground">
            이미 완료한 관문이 있어 목표와 골드 획득 설정을 바꿀 수 없습니다. 다른 레이드를 진행하려면 레이드 위젯을 새로 추가하세요.
          </p>
        )}

        {/* 목표(target)와 동일하게, 완료된 관문이 있으면(locked) 바꿀 수 없다 — 아래 목표 선택
            폼과 별개로 클릭 즉시 저장한다(docs/widgets.typ "레이드" 참고). */}
        <section className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-semibold text-foreground">골드 획득</h3>
            <p className="text-xs text-muted-foreground">
              꺼두면 이 레이드의 관문을 완료해도 골드/귀속골드를 받지 않은 것으로 기록됩니다.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={goldRewardEnabled}
            aria-label="골드 획득"
            disabled={locked}
            onClick={() => onGoldRewardChange(!goldRewardEnabled)}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full transition-colors',
              goldRewardEnabled ? 'bg-primary' : 'bg-border',
              locked && 'cursor-not-allowed opacity-50',
            )}
          >
            <span
              className={cn(
                'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                goldRewardEnabled && 'translate-x-5',
              )}
            />
          </button>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">목표 레이드</h3>
          {groups.length > 0 ? (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-lg border border-border p-2">
              {groups.map((group) => {
                const isExcluded = excludedRaidKeys.includes(group.raidKey)
                return (
                  <div key={group.raidKey} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 px-1">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          isExcluded ? 'text-muted-foreground/60' : 'text-foreground',
                        )}
                      >
                        {group.raidName}
                      </span>
                      {isExcluded && <span className="text-xs text-muted-foreground/60">이미 추가됨</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.difficulties.map((difficulty) => {
                        const isSelected =
                          !isExcluded && group.raidKey === raidKey && difficulty.difficultyKey === difficultyKey
                        return (
                          <button
                            key={difficulty.difficultyKey}
                            type="button"
                            disabled={locked || isExcluded}
                            aria-pressed={isSelected}
                            onClick={() => handleSelect(group.raidKey, difficulty.difficultyKey, isExcluded)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors',
                              isSelected
                                ? 'bg-primary/10 font-semibold text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              (locked || isExcluded) &&
                                'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground',
                            )}
                          >
                            <span>{difficulty.difficultyName}</span>
                            <span className="font-mono text-xs opacity-70">Lv.{difficulty.minItemLevel}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              현재 아이템 레벨({characterItemLevel})로 입장 가능한 레이드가 없습니다
            </p>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={locked || !raidKey || !difficultyKey}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
