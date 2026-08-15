import { Banknote, Book, Coins, CreditCard, Gem, ImagePlus, Layers, Package, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

// 보상 카탈로그(kurzanShardRewards.json/kurzanAzenaBlessingRewards.json)의 categoryKey별 아이콘.
// 개별 아이템 이미지(imageUrl)는 실제로 채워지는 곳이 없어 대신 카테고리 단위로 아이콘을 보여준다.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gold: Banknote,
  boundGold: Banknote,
  silver: Coins,
  expCardPack: CreditCard,
  cardPack: Layers,
  honingMaterialBox: Package,
  relicEngravingBook: Book,
  gem: Gem,
}

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
  /** 아이템을 클릭하면 바로 호출된다 — 별도 확인 단계 없이 즉시 보상을 확정한다. */
  onSelectItem?: (item: RewardItem) => void
  className?: string
}

/**
 * 편린 / 아제나 축복 등을 눌렀을 때 뜨는 보상 선택 모달. 재화 종류(카테고리) 탭으로 목록을
 * 좁혀보고, 아이템을 클릭하면 그 자리에서 바로 보상이 확정된다(onSelectItem 호출 후 모달 닫힘).
 */
export function RewardSelectionModal({
  open,
  onClose,
  title,
  categories,
  onSelectItem,
  className,
}: RewardSelectionModalProps) {
  const [activeCategoryKey, setActiveCategoryKey] = useState(categories[0]?.key)

  useEffect(() => {
    if (open) {
      setActiveCategoryKey(categories[0]?.key)
    }
  }, [open, categories])

  const activeCategory = categories.find((category) => category.key === activeCategoryKey) ?? categories[0]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      align="start"
      className={cn('max-w-4xl', className)}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3">
          {categories.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategoryKey(category.key)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 font-mono text-sm uppercase tracking-wide transition-colors',
                category.key === activeCategory?.key
                  ? 'bg-primary/10 font-bold text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="grid max-h-[65vh] grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
          {activeCategory?.items.map((item) => {
            const { id, name, quantity } = item
            const CategoryIcon = (activeCategory && CATEGORY_ICONS[activeCategory.key]) ?? ImagePlus
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onSelectItem?.(item)
                  onClose()
                }}
                className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-muted"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                  <CategoryIcon className="h-8 w-8 text-muted-foreground" />
                </span>
                <span className="font-mono text-sm uppercase leading-tight tracking-wide text-foreground">
                  {name}
                </span>
                <span className="font-mono text-sm font-bold text-muted-foreground">
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
