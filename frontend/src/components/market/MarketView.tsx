import { KeyRound, PackageSearch, Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { ComingSoonView } from '@/components/layout/ComingSoonView'
import { LostarkApiKeyModal } from '@/components/settings/LostarkApiKeyModal'
import { LineChart, type LineChartSeries } from '@/components/statistics/charts/LineChart'
import { Button } from '@/components/ui/button'
import {
  describeMarketApiError,
  fetchMarketItem,
  fetchMarketItemHistory,
  refreshMarketItem,
  refreshMarketItemsBatch,
} from '@/lib/market'
import { cssVar } from '@/lib/statisticsCategories'
import { fetchProfile } from '@/lib/user'
import { cn } from '@/lib/utils'
import type { MarketItemDailyStat, MarketItemPrice } from '@/types/market'

const WATCHLIST_STORAGE_KEY = 'loaplus:market:watchlist'
const HISTORY_DAYS = 14
const HISTORY_SERIES: LineChartSeries[] = [{ key: 'avgPrice', label: '평균 거래가', color: cssVar('--chart-1') }]

const numberFormatter = new Intl.NumberFormat('ko-KR')
function formatGold(value: number) {
  return `${numberFormatter.format(value)}G`
}

function loadWatchlist(): number[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is number => Number.isInteger(v)) : []
  } catch {
    return []
  }
}

function saveWatchlist(itemIds: number[]) {
  window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(itemIds))
}

/** 오늘부터 days일 전까지의 "YYYY-MM-DD" 범위. Market_Item_Daily_Stats의 date 형식과 동일하다. */
function recentDateRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - days)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { from: iso(from), to: iso(to) }
}

interface WatchedItemState {
  itemId: number
  price: MarketItemPrice | null
  error: string | null
  isRefreshing: boolean
  history: MarketItemDailyStat[] | null
  isHistoryOpen: boolean
}

/**
 * 거래소 시세 탭. 로스트아크 Open API 키를 등록한 유저만 사용 가능하다(docs/market_price.typ 참고
 * — 개인 키가 없어도 서버 공용 폴백 키로 조회 자체는 가능하지만, 이 기능은 개인 키 등록자 전용으로
 * 제한한다). 백엔드에 아이템 이름 검색 API가 아직 없어(docs/market_price.typ "구현 전 확인 필요"
 * 참고) 유저가 직접 아이템 ID를 입력해 관심 목록에 추가하는 방식으로 만든다. 관심 목록은 서버에
 * 저장되지 않는 순수 클라이언트 상태라 localStorage에 itemId만 보관한다.
 */
export function MarketView() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false)
  const [itemIdInput, setItemIdInput] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [items, setItems] = useState<WatchedItemState[]>([])
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)

  useEffect(() => {
    fetchProfile()
      .then((profile) => setHasApiKey(profile.hasLostarkApiKey))
      .catch((err) => console.error('프로필 조회 실패', err))
  }, [])

  useEffect(() => {
    if (!hasApiKey) return
    const itemIds = loadWatchlist()
    if (itemIds.length === 0) return
    setItems(
      itemIds.map((itemId) => ({
        itemId,
        price: null,
        error: null,
        isRefreshing: false,
        history: null,
        isHistoryOpen: false,
      })),
    )
    itemIds.forEach((itemId) => {
      fetchMarketItem(itemId)
        .then((price) => {
          setItems((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, price, error: null } : it)))
        })
        .catch((err) => {
          setItems((prev) =>
            prev.map((it) => (it.itemId === itemId ? { ...it, error: describeMarketApiError(err) } : it)),
          )
        })
    })
  }, [hasApiKey])

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault()
    const itemId = Number.parseInt(itemIdInput.trim(), 10)
    if (!Number.isInteger(itemId) || itemId <= 0) {
      setAddError('올바른 아이템 ID를 입력해 주세요.')
      return
    }
    if (items.some((it) => it.itemId === itemId)) {
      setAddError('이미 추가된 아이템입니다.')
      return
    }

    setIsAdding(true)
    setAddError(null)
    try {
      const price = await fetchMarketItem(itemId)
      setItems((prev) => {
        const next: WatchedItemState[] = [
          ...prev,
          { itemId, price, error: null, isRefreshing: false, history: null, isHistoryOpen: false },
        ]
        saveWatchlist(next.map((it) => it.itemId))
        return next
      })
      setItemIdInput('')
    } catch (err) {
      setAddError(describeMarketApiError(err))
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = (itemId: number) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.itemId !== itemId)
      saveWatchlist(next.map((it) => it.itemId))
      return next
    })
  }

  const handleRefreshOne = (itemId: number) => {
    setItems((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, isRefreshing: true } : it)))
    refreshMarketItem(itemId)
      .then((price) => {
        setItems((prev) =>
          prev.map((it) => (it.itemId === itemId ? { ...it, price, error: null, isRefreshing: false } : it)),
        )
      })
      .catch((err) => {
        setItems((prev) =>
          prev.map((it) =>
            it.itemId === itemId ? { ...it, error: describeMarketApiError(err), isRefreshing: false } : it,
          ),
        )
      })
  }

  const handleRefreshAll = async () => {
    if (items.length === 0) return
    setIsRefreshingAll(true)
    try {
      const refreshed = await refreshMarketItemsBatch(items.map((it) => it.itemId))
      const byId = new Map(refreshed.map((row) => [row.itemId, row]))
      setItems((prev) =>
        prev.map((it) => (byId.has(it.itemId) ? { ...it, price: byId.get(it.itemId)!, error: null } : it)),
      )
    } catch (err) {
      console.error('거래소 일괄 새로고침 실패', err)
    } finally {
      setIsRefreshingAll(false)
    }
  }

  const handleToggleHistory = (target: WatchedItemState) => {
    setItems((prev) =>
      prev.map((it) => (it.itemId === target.itemId ? { ...it, isHistoryOpen: !it.isHistoryOpen } : it)),
    )
    if (target.isHistoryOpen || target.history) return

    const { from, to } = recentDateRange(HISTORY_DAYS)
    fetchMarketItemHistory(target.itemId, from, to)
      .then((history) => {
        setItems((prev) => prev.map((it) => (it.itemId === target.itemId ? { ...it, history } : it)))
      })
      .catch((err) => console.error('거래소 히스토리 조회 실패', err))
  }

  if (hasApiKey === null) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center gap-4">
        <ComingSoonView
          icon={KeyRound}
          title="로스트아크 API 키가 필요합니다"
          description="거래소 시세 조회는 로스트아크 Open API 키를 등록한 유저만 이용할 수 있습니다."
        />
        <Button onClick={() => setIsKeyModalOpen(true)}>API 키 등록</Button>
        <LostarkApiKeyModal
          open={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onRegistered={() => setHasApiKey(true)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={itemIdInput}
            onChange={(event) => setItemIdInput(event.target.value)}
            placeholder="아이템 ID (예: 66102101)"
            className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <Button type="submit" disabled={isAdding}>
            <Plus className="h-4 w-4" />
            추가
          </Button>
        </form>

        <Button variant="outline" onClick={handleRefreshAll} disabled={isRefreshingAll || items.length === 0}>
          <RefreshCw className={cn('h-4 w-4', isRefreshingAll && 'animate-spin')} />
          전체 새로고침
        </Button>
      </div>

      {addError && <p className="text-sm text-red-500">{addError}</p>}

      {items.length === 0 ? (
        <ComingSoonView
          icon={PackageSearch}
          title="관심 아이템이 없습니다"
          description="위에서 아이템 ID를 입력해 거래소 시세를 추가해 보세요."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={it.itemId} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{it.price?.itemName ?? `#${it.itemId}`}</p>
                  <p className="text-xs text-muted-foreground">ID {it.itemId}</p>
                </div>

                {it.error ? (
                  <p className="text-sm text-red-500">{it.error}</p>
                ) : it.price ? (
                  <div className="text-right">
                    <p className="font-mono text-base text-secondary">{formatGold(it.price.currentMinPrice)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(it.price.updatedAt).toLocaleString('ko-KR')} 기준</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">불러오는 중...</p>
                )}

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="히스토리 보기" onClick={() => handleToggleHistory(it)}>
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="새로고침"
                    onClick={() => handleRefreshOne(it.itemId)}
                    disabled={it.isRefreshing}
                  >
                    <RefreshCw className={cn('h-4 w-4', it.isRefreshing && 'animate-spin')} />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="삭제" onClick={() => handleRemove(it.itemId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {it.isHistoryOpen && (
                <div className="mt-4 border-t border-border pt-4">
                  {it.history === null ? (
                    <p className="text-sm text-muted-foreground">히스토리 불러오는 중...</p>
                  ) : it.history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">최근 {HISTORY_DAYS}일간 데이터가 없습니다.</p>
                  ) : (
                    <LineChart
                      series={HISTORY_SERIES}
                      points={it.history.map((h) => ({ label: h.date.slice(5), values: { avgPrice: h.avgPrice } }))}
                      formatValue={formatGold}
                      height={200}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
