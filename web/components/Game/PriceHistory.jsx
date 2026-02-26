import { useState, useEffect, useMemo } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingDown, TrendingUp, DollarSign, Loader2, Store, ExternalLink, BarChart3, Filter } from "lucide-react"

const TIME_RANGES = [
  { label: "3M", value: "3m", months: 3 },
  { label: "6M", value: "6m", months: 6 },
  { label: "1A", value: "1y", months: 12 },
  { label: "2A", value: "2y", months: 24 },
  { label: "Tudo", value: "all", months: null }
]

const STORES = [
  { id: "steam", name: "Steam" },
  { id: "nuuvem", name: "Nuuvem" },
  { id: "greenmangaming", name: "GMG" },
  { id: "epicgamestore", name: "Epic" },
  { id: "gog", name: "GOG" }
]

function StatCard({ icon: Icon, label, value, subValue }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
    </div>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">
        {new Date(data.date).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        })}
      </p>
      <p className="text-sm font-semibold text-white">
        R$ {data.price.toFixed(2)}
      </p>
      <p className="text-xs text-zinc-500">{data.store}</p>
      {data.discount > 0 && (
        <p className="text-xs text-green-400">-{data.discount}% off</p>
      )}
    </div>
  )
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  )
}

export default function PriceHistory({ steamId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("1y")
  const [selectedStores, setSelectedStores] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!steamId) return

    setLoading(true)
    setData(null)

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/prices/history?steamId=${steamId}`)
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
  }, [steamId])

  const filteredStoreLows = useMemo(() => {
    if (!data?.storeLows?.length) return []

    let filtered = [...data.storeLows]

    const range = TIME_RANGES.find(r => r.value === timeRange)
    if (range?.months) {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - range.months)
      filtered = filtered.filter(item => new Date(item.date) >= cutoff)
    }

    if (selectedStores.length > 0) {
      filtered = filtered.filter(item => 
        selectedStores.some(s => item.store.toLowerCase().includes(s))
      )
    }

    return filtered.sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [data?.storeLows, timeRange, selectedStores])

  const chartData = useMemo(() => {
    return filteredStoreLows
      .filter(item => item.date && item.price)
      .map(item => ({
        date: item.date,
        price: item.price,
        store: item.store,
        discount: item.discount
      }))
  }, [filteredStoreLows])

  const filteredStats = useMemo(() => {
    if (!filteredStoreLows.length) return null

    const prices = filteredStoreLows.map(s => s.price)
    return {
      lowest: Math.min(...prices),
      highest: Math.max(...prices),
      average: prices.reduce((a, b) => a + b, 0) / prices.length
    }
  }, [filteredStoreLows])

  const toggleStore = (storeId) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    )
  }

  const availableStores = useMemo(() => {
    if (!data?.storeLows?.length) return []
    
    const storeNames = [...new Set(data.storeLows.map(s => s.store))]
    return STORES.filter(store => 
      storeNames.some(name => name.toLowerCase().includes(store.id))
    )
  }, [data?.storeLows])

  if (loading) {
    return (
      <>
        <hr className="my-6 border-zinc-700" />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
        </div>
      </>
    )
  }

  if (!data || data.notFound || (!data.deals?.length && !data.storeLows?.length)) return null

  const { stats, deals } = data

  return (
    <>
      <hr className="my-6 border-zinc-700" />

      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-zinc-600" />
            <h2 className="text-xl font-bold text-white">Preços</h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              showFilters || selectedStores.length > 0
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {selectedStores.length > 0 && (
              <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {selectedStores.length}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-zinc-800/30 border border-zinc-700 rounded-lg space-y-4">
            <div>
              <p className="text-xs text-zinc-500 mb-2">Período</p>
              <div className="flex flex-wrap gap-2">
                {TIME_RANGES.map(range => (
                  <FilterButton
                    key={range.value}
                    active={timeRange === range.value}
                    onClick={() => setTimeRange(range.value)}
                  >
                    {range.label}
                  </FilterButton>
                ))}
              </div>
            </div>

            {availableStores.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-2">Lojas</p>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={selectedStores.length === 0}
                    onClick={() => setSelectedStores([])}
                  >
                    Todas
                  </FilterButton>
                  {availableStores.map(store => (
                    <FilterButton
                      key={store.id}
                      active={selectedStores.includes(store.id)}
                      onClick={() => toggleStore(store.id)}
                    >
                      {store.name}
                    </FilterButton>
                  ))}
                </div>
              </div>
            )}

            {(selectedStores.length > 0 || timeRange !== "1y") && (
              <button
                onClick={() => {
                  setSelectedStores([])
                  setTimeRange("1y")
                }}
                className="text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={DollarSign}
            label="Preço Atual"
            value={stats?.currentPrice ? `R$ ${stats.currentPrice.toFixed(2)}` : "—"}
          />
          <StatCard
            icon={TrendingDown}
            label="Menor (Histórico)"
            value={stats?.lowestEver ? `R$ ${stats.lowestEver.toFixed(2)}` : "—"}
          />
          <StatCard
            icon={TrendingDown}
            label="Menor (Filtrado)"
            value={filteredStats?.lowest ? `R$ ${filteredStats.lowest.toFixed(2)}` : "—"}
          />
          <StatCard
            icon={TrendingUp}
            label="Média (Filtrado)"
            value={filteredStats?.average ? `R$ ${filteredStats.average.toFixed(2)}` : "—"}
          />
        </div>

        {chartData.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-semibold text-white">Menores preços ao longo do tempo</h3>
              <span className="text-xs text-zinc-600">({chartData.length} registros)</span>
            </div>
            <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
                    stroke="#71717a"
                    style={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#71717a"
                    style={{ fontSize: 11 }}
                    tickFormatter={(value) => `R$${value}`}
                    width={60}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {deals?.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Onde comprar</h3>
            <div className="grid gap-2">
              {deals.map((deal, i) => (
                <a
                  key={i}
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Store className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-white">{deal.store}</span>
                      {deal.storeLow && (
                        <p className="text-xs text-zinc-500 truncate">
                          Menor nessa loja: R$ {deal.storeLow.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {deal.discount > 0 && (
                      <>
                        <span className="text-xs text-zinc-500 line-through hidden sm:inline">
                          R$ {deal.oldPrice.toFixed(2)}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded">
                          -{deal.discount}%
                        </span>
                      </>
                    )}
                    <span className="text-sm font-bold text-green-400">
                      R$ {deal.price.toFixed(2)}
                    </span>
                    <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {filteredStoreLows?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">
              Menores preços por loja
              {filteredStoreLows.length !== data.storeLows?.length && (
                <span className="text-xs text-zinc-500 font-normal ml-2">
                  ({filteredStoreLows.length} de {data.storeLows?.length})
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {filteredStoreLows
                .sort((a, b) => a.price - b.price)
                .slice(0, 8)
                .map((low, i) => (
                  <div
                    key={i}
                    className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg"
                  >
                    <p className="text-xs text-zinc-500 truncate">{low.store}</p>
                    <p className="text-lg font-bold text-white">R$ {low.price.toFixed(2)}</p>
                    <p className="text-xs text-zinc-600">{low.date}</p>
                    {low.discount > 0 && (
                      <span className="text-xs text-green-400">-{low.discount}%</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
