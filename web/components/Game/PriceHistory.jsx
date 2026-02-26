import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { TrendingDown, TrendingUp, Calendar, DollarSign, Loader2, Store } from "lucide-react"

const TIME_RANGES = [
  { label: "1M", value: "1m", months: 1 },
  { label: "3M", value: "3m", months: 3 },
  { label: "6M", value: "6m", months: 6 },
  { label: "1A", value: "1y", months: 12 },
  { label: "Tudo", value: "all", months: null }
]

const STORES = [
  { id: "steam", name: "Steam", color: "#1b2838" },
  { id: "nuuvem", name: "Nuuvem", color: "#0d7377" },
  { id: "greenmangaming", name: "GMG", color: "#7cb305" },
  { id: "epicgames", name: "Epic", color: "#2a2a2a" }
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-zinc-400 mb-2">
        {new Date(data.date).toLocaleDateString("pt-BR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        })}
      </p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-zinc-300">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-white">
              R$ {entry.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, trend, trendValue }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend === "up" ? "text-red-400" : "text-green-400"}`}>
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}

export default function PriceHistory({ gameName }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("6m")
  const [selectedStores, setSelectedStores] = useState(["steam"])
  const [chartType, setChartType] = useState("area")

  useEffect(() => {
    if (!gameName) return

    setLoading(true)
    setData(null)

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/prices/history?gameName=${encodeURIComponent(gameName)}`)
        const json = await res.json()
        setData(json)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
  }, [gameName])

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

  if (!data || data.notFound || !data.history?.length) return null

  const filteredData = (() => {
    const range = TIME_RANGES.find(r => r.value === timeRange)
    if (!range.months) return data.history

    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - range.months)
    
    return data.history.filter(item => new Date(item.date) >= cutoff)
  })()

  const storeFilteredData = filteredData.filter(item => 
    selectedStores.includes(item.store?.toLowerCase().replace(/\s+/g, ''))
  )

  const displayData = storeFilteredData.length > 0 ? storeFilteredData : filteredData

  const currentPrice = data.current?.price || 0
  const lowestPrice = data.stats?.lowest || 0
  const highestPrice = data.stats?.highest || 0
  const avgPrice = data.stats?.average || 0

  const discount = highestPrice > 0 ? Math.round(((highestPrice - currentPrice) / highestPrice) * 100) : 0

  const toggleStore = (storeId) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    )
  }

  return (
    <>
      <hr className="my-6 border-zinc-700" />

      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-zinc-600" />
            <h2 className="text-xl font-bold text-white">Histórico de Preços</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={DollarSign}
            label="Preço Atual"
            value={`R$ ${currentPrice.toFixed(2)}`}
            trend={currentPrice < avgPrice ? "down" : "up"}
            trendValue={`${Math.abs(discount)}%`}
          />
          <StatCard
            icon={TrendingDown}
            label="Menor Preço"
            value={`R$ ${lowestPrice.toFixed(2)}`}
          />
          <StatCard
            icon={TrendingUp}
            label="Maior Preço"
            value={`R$ ${highestPrice.toFixed(2)}`}
          />
          <StatCard
            icon={Calendar}
            label="Preço Médio"
            value={`R$ ${avgPrice.toFixed(2)}`}
          />
        </div>

        <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Período:</span>
              <div className="flex gap-1">
                {TIME_RANGES.map(range => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                      timeRange === range.value
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-px bg-zinc-700" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Tipo:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setChartType("line")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    chartType === "line"
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  Linha
                </button>
                <button
                  onClick={() => setChartType("area")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    chartType === "area"
                      ? "bg-blue-500 text-white"
                      : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  }`}
                >
                  Área
                </button>
              </div>
            </div>

            <div className="h-4 w-px bg-zinc-700" />

            <div className="flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500">Lojas:</span>
              <div className="flex flex-wrap gap-1">
                {STORES.map(store => (
                  <button
                    key={store.id}
                    onClick={() => toggleStore(store.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      selectedStores.includes(store.id)
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                    }`}
                  >
                    {store.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
          <ResponsiveContainer width="100%" height={400}>
            {chartType === "area" ? (
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  stroke="#71717a"
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#71717a"
                  style={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                  name="Preço"
                />
              </AreaChart>
            ) : (
              <LineChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  stroke="#71717a"
                  style={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#71717a"
                  style={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Preço"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {data.deals?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white mb-3">Ofertas Ativas</h3>
            <div className="grid gap-2">
              {data.deals.map((deal, i) => (
                <a
                  key={i}
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Store className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium text-white">{deal.store}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {deal.discount > 0 && (
                      <span className="text-xs text-zinc-500 line-through">
                        R$ {deal.oldPrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-sm font-bold text-green-400">
                      R$ {deal.price.toFixed(2)}
                    </span>
                    {deal.discount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 rounded">
                        -{deal.discount}%
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
