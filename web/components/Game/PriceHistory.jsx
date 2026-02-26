import { useState, useEffect } from "react"
import { TrendingDown, TrendingUp, DollarSign, Loader2, Store, ExternalLink } from "lucide-react"

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

export default function PriceHistory({ gameName }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (!data || data.notFound || (!data.deals?.length && !data.storeLows?.length)) return null

  const { stats, deals, storeLows } = data

  return (
    <>
      <hr className="my-6 border-zinc-700" />

      <div>
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="w-5 h-5 text-zinc-600" />
          <h2 className="text-xl font-bold text-white">Preços</h2>
        </div>

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
            label="Menor (12 meses)"
            value={stats?.lowestYear ? `R$ ${stats.lowestYear.toFixed(2)}` : "—"}
          />
          <StatCard
            icon={TrendingUp}
            label="Menor (3 meses)"
            value={stats?.lowestMonth ? `R$ ${stats.lowestMonth.toFixed(2)}` : "—"}
          />
        </div>

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

        {storeLows?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Menores preços históricos por loja</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {storeLows
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
