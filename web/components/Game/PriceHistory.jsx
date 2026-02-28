import { useState, useEffect, useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { TrendingDown, DollarSign, Loader2, Store, ExternalLink } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

function CustomTooltip({ active, payload }) {
  const { t } = useTranslation("game.prices")

  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-white mb-1">{data.store}</p>
      <p className="text-sm font-bold text-green-400">R$ {data.price.toFixed(2)}</p>
      {data.discount > 0 && (
        <p className="text-[11px] text-zinc-400">
          {t("tooltip.discount", { discount: data.discount, regular: data.regular.toFixed(2) })}
        </p>
      )}
      <p className="text-[11px] text-zinc-500 mt-1">{data.date}</p>
    </div>
  )
}

export default function PriceHistory({ steamId }) {
  const { t, language } = useTranslation("game.prices")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const chartData = useMemo(() => {
    if (!data?.storeLows?.length) return []
    return data.storeLows
      .sort((a, b) => a.price - b.price)
      .slice(0, 10)
      .map(item => ({
        store: item.store,
        price: item.price,
        regular: item.regular,
        discount: item.discount,
        date: new Date(item.date).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      }))
  }, [data?.storeLows, language])

  if (loading) {
    return (
      <>
        <hr className="my-6 border-zinc-700" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
        </div>
      </>
    )
  }

  if (!data || data.notFound || (!data.deals?.length && !data.storeLows?.length)) return null

  const { stats, deals } = data
  const currentPrice = stats?.currentPrice
  const lowestEver = stats?.lowestEver
  const savingsPercent = currentPrice && lowestEver
    ? Math.round(((currentPrice - lowestEver) / currentPrice) * 100)
    : 0

  return (
    <>
      <hr className="my-6 border-zinc-700" />

      <div>
        <div className="flex items-center gap-2 mb-5">
          <DollarSign className="w-4 h-4 text-zinc-500" />
          <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3.5">
            <span className="text-[11px] text-zinc-500 block mb-1">{t("stats.current")}</span>
            <span className="text-xl font-bold text-white">
              {currentPrice ? `R$ ${currentPrice.toFixed(2)}` : "—"}
            </span>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3.5">
            <span className="text-[11px] text-zinc-500 block mb-1">{t("stats.lowestEver")}</span>
            <span className="text-xl font-bold text-green-400">
              {lowestEver ? `R$ ${lowestEver.toFixed(2)}` : "—"}
            </span>
            {savingsPercent > 0 && (
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                {t("stats.belowCurrent", { percent: savingsPercent })}
              </span>
            )}
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3.5">
            <span className="text-[11px] text-zinc-500 block mb-1">{t("stats.lowest12m")}</span>
            <span className="text-xl font-bold text-white">
              {stats?.lowestYear ? `R$ ${stats.lowestYear.toFixed(2)}` : "—"}
            </span>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3.5">
            <span className="text-[11px] text-zinc-500 block mb-1">{t("stats.lowest3m")}</span>
            <span className="text-xl font-bold text-white">
              {stats?.lowestMonth ? `R$ ${stats.lowestMonth.toFixed(2)}` : "—"}
            </span>
          </div>
        </div>

        {chartData.length > 1 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              {t("chartTitle")}
            </h3>
            <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={chartData.length * 40 + 20}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#52525b"
                    style={{ fontSize: 11 }}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="store"
                    stroke="#52525b"
                    style={{ fontSize: 11 }}
                    width={120}
                    tick={{ fill: "#a1a1aa" }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="price" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? "#22c55e" : "#3f3f46"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {deals?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              {t("dealsTitle")}
            </h3>
            <div className="space-y-2">
              {deals.map((deal, i) => (
                <a
                  key={i}
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Store className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-white block">{deal.store}</span>
                      {deal.storeLow != null && (
                        <span className="text-[11px] text-zinc-500">
                          {t("deal.storeLowest", { price: deal.storeLow.toFixed(2) })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    {deal.discount > 0 && (
                      <>
                        <span className="text-xs text-zinc-500 line-through hidden sm:inline">
                          R$ {deal.oldPrice.toFixed(2)}
                        </span>
                        <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-green-500/20 text-green-400 rounded">
                          -{deal.discount}%
                        </span>
                      </>
                    )}
                    <span className="text-sm font-bold text-green-400">
                      R$ {deal.price.toFixed(2)}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
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
