import { useState, useEffect, useRef } from "react"
import { Receipt, Package, MessageSquare, Heart, Trophy, TrendingDown, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import Pagination from "@components/UI/Pagination"

const TRANSACTIONS_PER_PAGE = 20

const TRANSACTION_ICONS = {
  chest_opened: { icon: Package, color: "text-amber-400", bg: "bg-amber-500/10" },
  review_reward: { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" },
  like_reward: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10" },
  event_reward: { icon: Trophy, color: "text-purple-400", bg: "bg-purple-500/10" },
  shop_purchase: { icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
}

const MINERALS_CONFIG = [
  { key: "copper", color: "#B87333" },
  { key: "iron", color: "#A8A8A8" },
  { key: "gold", color: "#FFD700" },
  { key: "emerald", color: "#50C878" },
  { key: "diamond", color: "#B9F2FF" },
  { key: "ruby", color: "#E0115F" },
]

function TransactionsSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-800 rounded w-1/4" />
            <div className="flex gap-2">
              <div className="h-6 bg-zinc-800 rounded w-16" />
              <div className="h-6 bg-zinc-800 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation("profile")

  return (
    <div className="rounded-xl p-10 sm:p-14 bg-zinc-800/50 border border-zinc-700 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <Receipt className="w-6 h-6 text-zinc-600" />
      </div>
      <div className="text-center">
        <p className="text-sm text-zinc-400 font-medium">{t("transactions.empty.title")}</p>
        <p className="text-sm text-zinc-600 mt-1">{t("transactions.empty.subtitle")}</p>
      </div>
    </div>
  )
}

function MineralsChange({ minerals }) {
  const { t } = useTranslation("minerals")

  const entries = Object.entries(minerals || {}).filter(([_, amount]) => amount !== 0)

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([key, amount]) => {
        const config = MINERALS_CONFIG.find((m) => m.key === key)
        if (!config) return null

        const isPositive = amount > 0

        return (
          <div
            key={key}
            className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-lg"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: config.color }}
            />
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: isPositive ? "#4ade80" : "#f87171" }}
            >
              {isPositive ? "+" : ""}{amount}
            </span>
            <span className="text-xs text-zinc-500">{t(`items.${key}.name`)}</span>
          </div>
        )
      })}
    </div>
  )
}

function TransactionItem({ transaction }) {
  const { t } = useTranslation("profile")
  const { getTimeAgo } = useDateTime()

  const config = TRANSACTION_ICONS[transaction.transaction_type] || {
    icon: Receipt,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10",
  }

  const Icon = config.icon

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-zinc-800/30 transition-colors rounded-xl">
      <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium text-white">
            {t(`transactions.types.${transaction.transaction_type}`)}
          </p>
          <span className="text-xs text-zinc-500 flex-shrink-0">
            {getTimeAgo(transaction.created_at)}
          </span>
        </div>

        {transaction.description && (
          <p className="text-xs text-zinc-500 mb-2">
            {t(`transactions.descriptions.${transaction.description}`) || transaction.description}
            {transaction.details && (<span className="ml-1">{transaction.details}</span>)}
          </p>
        )}

        <MineralsChange minerals={transaction.minerals_changed} />
      </div>
    </div>
  )
}

export default function TransactionsSection({ userId }) {
  const { t } = useTranslation("profile")
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    fetchTransactions()
  }, [userId, page])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        userId,
        page,
        limit: TRANSACTIONS_PER_PAGE,
      })

      const res = await fetch(`/api/transactions/list?${params}`)

      if (!res.ok) throw new Error()

      const data = await res.json()
      setTransactions(data.transactions || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function handlePageChange(newPage) {
    setPage(newPage)
    const el = containerRef.current
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 24
      window.scrollTo({ top: y, behavior: "smooth" })
    }
  }

  if (loading && page === 1) return <TransactionsSkeleton />

  if (total === 0 && !loading) return <EmptyState />

  return (
    <div className="space-y-6" ref={containerRef}>
      {loading ? (
        <TransactionsSkeleton />
      ) : (
        <>
          <div className="divide-y divide-zinc-800/50">
            {transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  )
}
