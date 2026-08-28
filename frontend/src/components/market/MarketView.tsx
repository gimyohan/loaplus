import { Crown, PackageSearch, Trash2, TrendingUp } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { ComingSoonView } from '@/components/layout/ComingSoonView'
import { LineChart, type LineChartSeries } from '@/components/statistics/charts/LineChart'
import { Button } from '@/components/ui/button'
import { describeMarketApiError, fetchMarketItemHistory, searchMarketItems } from '@/lib/market'
import { cssVar } from '@/lib/statisticsCategories'
import { cn } from '@/lib/utils'
import type { MarketItemDailyStat, MarketItemSearchResult } from '@/types/market'

const WATCHLIST_STORAGE_KEY = 'loaplus:market:watchlist'
const HISTORY_DAYS = 14
const SEARCH_DEBOUNCE_MS = 300
const MIN_SEARCH_QUERY_LENGTH = 2
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

/** 아이템 이미지(Market_Item_Current_Prices.icon을 itemId로 조인해 받은 값, 사용자 확정 —
 * 없으면 회색 자리표시자). 검색 결과·관심 목록 양쪽에서 같이 쓴다. */
function ItemIcon({ src, className }: { src: string | null; className: string }) {
  if (!src) return <span className={cn('shrink-0 rounded bg-muted', className)} />
  return <img src={src} alt="" className={cn('shrink-0 rounded object-contain', className)} />
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
  /** 검색 결과에서 고를 때 즉시 채워진다. 새로고침 뒤 관심 목록만으로 복원한 경우엔 history가
   * 도착하기 전까지 잠깐 null일 수 있다. */
  itemName: string | null
  icon: string | null
  /** null = 아직 불러오는 중, 빈 배열 = 최근 HISTORY_DAYS일간 데이터 없음. 날짜 오름차순이라
   * 마지막 원소가 가장 최근 값이다. */
  history: MarketItemDailyStat[] | null
  error: string | null
  isHistoryOpen: boolean
}

/** history의 마지막(가장 최근 날짜) 원소 — 화면 상단에 보여줄 "현재" 값으로 쓴다. */
function latestStat(history: MarketItemDailyStat[] | null): MarketItemDailyStat | null {
  if (!history || history.length === 0) return null
  return history[history.length - 1]!
}

export interface MarketViewProps {
  /** App.tsx가 GET /api/user/profile로 한 번 조회해 내려준다 — 프리미엄 유저만 이 탭을 쓸 수
   * 있다(로스트아크 API 키 등록 여부와 무관, 사용자 확정). 사이드바가 이미 비프리미엄 유저에게
   * Market 항목 자체를 숨기지만(Sidebar.tsx), 탭 전환 도중 프리미엄이 만료되는 등의 경우를
   * 대비해 이 화면도 독립적으로 다시 확인한다. */
  isPremium: boolean
}

/**
 * 거래소 시세 탭. Market_Item_Daily_Stats(일별 시세 통계) *만* 참조한다(사용자 확정) — 매일
 * 새벽 야간 배치로만 채워지는 전 유저 공용 데이터라, 유저의 로스트아크 API 키나 실시간 새로고침이
 * 전혀 필요 없다. 아이템은 이름으로 검색해(GET /api/market/items?search=) 관심 목록에 추가하고,
 * "가격"으로 보여주는 값은 그 아이템의 가장 최근 날짜 일평균 거래가다(실시간 최소 판매가가
 * 아니다 — Market_Item_Current_Prices/파이프라인 B는 이 탭에서 쓰지 않는다, 이미지만 예외로 그
 * 테이블의 icon 컬럼을 itemId로 조인해 받는다). 관심 목록은 서버에 저장되지 않는 순수 클라이언트
 * 상태라 localStorage에 itemId만 보관한다.
 */
export function MarketView({ isPremium }: MarketViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MarketItemSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [items, setItems] = useState<WatchedItemState[]>([])

  const loadHistoryFor = (itemId: number) => {
    const { from, to } = recentDateRange(HISTORY_DAYS)
    fetchMarketItemHistory(itemId, from, to)
      .then((history) => {
        setItems((prev) =>
          prev.map((it) =>
            it.itemId === itemId
              ? {
                  ...it,
                  history,
                  error: null,
                  itemName: it.itemName ?? history[0]?.itemName ?? it.itemName,
                  icon: it.icon ?? history[0]?.icon ?? it.icon,
                }
              : it,
          ),
        )
      })
      .catch((err) => {
        setItems((prev) =>
          prev.map((it) => (it.itemId === itemId ? { ...it, error: describeMarketApiError(err) } : it)),
        )
      })
  }

  useEffect(() => {
    // 비프리미엄 유저는 아래에서 렌더 자체를 막지만, 그 전에 이 이펙트가 먼저 실행돼 어차피
    // 403이 날 API 호출을 굳이 보내지 않도록 여기서도 한 번 더 확인한다.
    if (!isPremium) return
    const itemIds = loadWatchlist()
    if (itemIds.length === 0) return
    setItems(
      itemIds.map((itemId) => ({ itemId, itemName: null, icon: null, history: null, error: null, isHistoryOpen: false })),
    )
    itemIds.forEach(loadHistoryFor)
    // loadHistoryFor는 매 렌더 새로 만들어지는 함수라 deps에 넣으면 이 이펙트가 렌더마다
    // 다시 실행돼버린다 — 마운트 시 관심 목록을 한 번만 복원하면 되므로 isPremium만 둔다.
  }, [isPremium])

  // 타이핑할 때마다 API를 부르지 않도록 300ms 디바운스한다. 두 글자 미만이면 결과가 너무
  // 많아 아예 조회하지 않는다.
  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = window.setTimeout(() => {
      searchMarketItems(query)
        .then(setSearchResults)
        .catch((err) => {
          console.error('아이템 검색 실패', err)
          setSearchResults([])
        })
        .finally(() => setIsSearching(false))
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchQuery])

  const handleSelectSearchResult = (result: MarketItemSearchResult) => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearchOpen(false)

    if (items.some((it) => it.itemId === result.itemId)) {
      setAddError('이미 추가된 아이템입니다.')
      return
    }
    setAddError(null)
    setIsAdding(true)
    setItems((prev) => {
      const next: WatchedItemState[] = [
        ...prev,
        {
          itemId: result.itemId,
          itemName: result.itemName,
          icon: result.icon,
          history: null,
          error: null,
          isHistoryOpen: false,
        },
      ]
      saveWatchlist(next.map((it) => it.itemId))
      return next
    })
    loadHistoryFor(result.itemId)
    setIsAdding(false)
  }

  // 결과가 뜬 상태에서 그냥 Enter만 눌러도(마우스 없이) 첫 결과를 추가할 수 있게 한다.
  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (searchResults.length > 0) handleSelectSearchResult(searchResults[0]!)
  }

  const handleRemove = (itemId: number) => {
    setItems((prev) => {
      const next = prev.filter((it) => it.itemId !== itemId)
      saveWatchlist(next.map((it) => it.itemId))
      return next
    })
  }

  const handleToggleHistory = (itemId: number) => {
    setItems((prev) => prev.map((it) => (it.itemId === itemId ? { ...it, isHistoryOpen: !it.isHistoryOpen } : it)))
  }

  if (!isPremium) {
    return (
      <ComingSoonView
        icon={Crown}
        title="프리미엄 회원 전용 기능입니다"
        description="거래소 시세 조회는 프리미엄 회원만 이용할 수 있습니다. Settings 탭에서 구독 안내를 확인해 주세요."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-fit">
        <form onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => setIsSearchOpen(false)}
            disabled={isAdding}
            placeholder="아이템 이름 검색 (예: 아비도스 융화 재료)"
            className="w-72 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
        </form>

        {isSearchOpen && searchQuery.trim().length >= MIN_SEARCH_QUERY_LENGTH && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
            {isSearching ? (
              <p className="p-3 text-sm text-muted-foreground">검색 중...</p>
            ) : searchResults.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">검색 결과가 없습니다.</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.itemId}
                  type="button"
                  // onMouseDown + preventDefault: input이 blur되기 전에 먼저 잡혀서, 목록을 클릭해도
                  // input의 onBlur(드롭다운 닫기)가 클릭보다 먼저 실행돼 목록이 사라지는 걸 막는다.
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelectSearchResult(result)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <ItemIcon src={result.icon} className="h-6 w-6" />
                  <span className="flex-1 truncate text-foreground">{result.itemName}</span>
                  <span className="shrink-0 font-mono text-xs text-secondary">{formatGold(result.avgPrice)}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{result.date}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {addError && <p className="text-sm text-red-500">{addError}</p>}

      {items.length === 0 ? (
        <ComingSoonView
          icon={PackageSearch}
          title="관심 아이템이 없습니다"
          description="위에서 아이템 이름을 검색해 거래소 시세를 추가해 보세요."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => {
            const latest = latestStat(it.history)
            return (
              <div key={it.itemId} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <ItemIcon src={it.icon} className="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{it.itemName ?? `#${it.itemId}`}</p>
                      <p className="text-xs text-muted-foreground">ID {it.itemId}</p>
                    </div>
                  </div>

                  {it.error ? (
                    <p className="text-sm text-red-500">{it.error}</p>
                  ) : it.history === null ? (
                    <p className="text-sm text-muted-foreground">불러오는 중...</p>
                  ) : latest ? (
                    <div className="text-right">
                      <p className="font-mono text-base text-secondary">{formatGold(latest.avgPrice)}</p>
                      <p className="text-xs text-muted-foreground">{latest.date} 평균 거래가</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">최근 {HISTORY_DAYS}일간 데이터 없음</p>
                  )}

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="히스토리 보기"
                      onClick={() => handleToggleHistory(it.itemId)}
                    >
                      <TrendingUp className="h-4 w-4" />
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
            )
          })}
        </div>
      )}
    </div>
  )
}
