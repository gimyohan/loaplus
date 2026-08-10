import { ImagePlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export interface RewardItem {
  id: string
  name: string
  quantity: number
  /** 아직 준비되지 않은 아이템은 null. 이미지가 없으면 자리표시 아이콘을 보여준다 */
  imageUrl: string | null
}

export interface RewardCategory {
  key: string
  label: string
  items: RewardItem[]
}

export interface RewardSelectionModalProps {
  open: boolean
  onClose: () => void
  title: string
  categories: RewardCategory[]
  className?: string
}

/**
 * 편린 / 아제나 축복 등을 눌렀을 때 뜨는 보상 선택 모달. 재화 종류(카테고리) 탭으로 목록을
 * 좁혀보고, 그중 하나를 선택할 수 있다. 실제 보상 확정/서버 연동은 아직 없고 지금은
 * 선택 상태만 시각적으로 보여준다.
 */
export function RewardSelectionModal({
  open,
  onClose,
  title,
  categories,
  className,
}: RewardSelectionModalProps) {
  const [activeCategoryKey, setActiveCategoryKey] = useState(categories[0]?.key)
  const [selectedItemId, setSelectedItemId] = useState(categories[0]?.items[0]?.id)

  useEffect(() => {
    if (open) {
      setActiveCategoryKey(categories[0]?.key)
      setSelectedItemId(categories[0]?.items[0]?.id)
    }
  }, [open, categories])

  const activeCategory = categories.find((category) => category.key === activeCategoryKey) ?? categories[0]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      align="start"
      className={cn('max-w-2xl', className)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border pb-2">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategoryKey(category.key)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors',
                category.key === activeCategory?.key
                  ? 'bg-primary/10 font-bold text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {activeCategory?.items.map(({ id, name, quantity, imageUrl }) => {
            const isSelected = id === selectedItemId
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedItemId(id)}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 rounded-lg border p-3 text-center transition-colors',
                  isSelected
                    ? 'border-primary bg-muted shadow-[inset_0_0_10px_rgba(92,122,255,0.1)]'
                    : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted',
                    isSelected ? 'border-primary/30' : 'border-border',
                  )}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus
                      className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')}
                    />
                  )}
                </span>
                <span className="font-mono text-[10px] uppercase leading-tight tracking-wide text-foreground">
                  {name}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] font-bold',
                    isSelected ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  x{quantity.toLocaleString('ko-KR')}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
