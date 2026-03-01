import { useState, useEffect } from "react"
import { ExternalLink, Clock, TrendingUp, Sparkles, Flame } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import DragScrollRow from "@components/UI/DragScrollRow"

function SaleCardSkeleton() {
  return (
    <div className="w-48 flex-shrink-0 bg-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="h-22 bg-zinc-700" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-zinc-700 rounded w-3/4" />
        <div className="h-4 bg-zinc-700 rounded w-1/2" />
      </div>
    </div>
  )
}

function SpotlightCard({ spotlight }) {
  return (
    <a
      href={spotlight.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 w-72 rounded-xl overflow-hidden border border-zinc-700/50 hover:border-zinc-600 transition-all hover:scale-[1.01] hover:shadow-xl"
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={spotlight.image}
          alt={spotlight.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-1">{spotlight.name}</h3>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-300/80">
            <ExternalLink className="w-3 h-3" />
            <span>Steam</span>
          </div>
        </div>
      </div>
    </a>
  )
}

function DailyDealCard({ game, language }) {
  const { t, getLanguageConfig } = useTranslation("home")
  const config = getLanguageConfig(language)

  const formatPrice = (cents) => {
    if (!cents) return language === "pt" ? "Grátis" : "Free"
    return new Intl.NumberFormat(config.numberLocale, {
      style: "currency",
      currency: game.currency || (language === "pt" ? "BRL" : "USD")
    }).format(cents / 100)
  }

  const timeLeft = game.discountExpiration
    ? Math.max(0, Math.floor((game.discountExpiration * 1000 - Date.now()) / 3600000))
    : null

  return (
    <a
      href={game.steamUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-zinc-800/90 to-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all hover:shadow-xl"
    >
      <div className="relative w-full sm:w-48 flex-shrink-0">
        <img
          src={game.image}
          alt={game.name}
          className="w-full sm:w-48 h-32 sm:h-22 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-2 left-2 sm:hidden text-[10px] uppercase tracking-wider text-amber-400 font-bold bg-black/60 px-2 py-1 rounded">
          {t("steam.dailyDeal")}
        </span>
        <span className="absolute top-2 right-2 sm:hidden bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">
          -{game.discountPercent}%
        </span>
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <span className="hidden sm:block text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-1">
          {t("steam.dailyDeal")}
        </span>
        <h3 className="text-sm sm:text-base font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
          {game.name}
        </h3>
        <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2">
          <span className="hidden sm:inline bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded">
            -{game.discountPercent}%
          </span>
          <span className="text-xs text-zinc-500 line-through">
            {formatPrice(game.originalPrice)}
          </span>
          <span className="text-sm font-bold text-green-400">
            {formatPrice(game.finalPrice)}
          </span>
        </div>
        {timeLeft !== null && (
          <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[11px] text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>
              {timeLeft > 0
                ? t("steam.hoursLeft", { count: timeLeft })
                : t("steam.endingSoon")
              }
            </span>
          </div>
        )}
      </div>
    </a>
  )
}

function SaleCard({ game, language }) {
  const { getLanguageConfig } = useTranslation()
  const config = getLanguageConfig(language)

  const formatPrice = (cents) => {
    if (!cents) return language === "pt" ? "Grátis" : "Free"
    return new Intl.NumberFormat(config.numberLocale, {
      style: "currency",
      currency: game.currency || (language === "pt" ? "BRL" : "USD")
    }).format(cents / 100)
  }

  return (
    <a
      href={game.steamUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-48 flex-shrink-0 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl"
    >
      <div className="relative h-22 overflow-hidden">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {game.discounted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
            -{game.discountPercent}%
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
      </div>

      <div className="p-2.5">
        <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
          {game.name}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          {game.discounted ? (
            <>
              <span className="text-xs text-zinc-500 line-through">
                {formatPrice(game.originalPrice)}
              </span>
              <span className="text-sm font-bold text-green-400">
                {formatPrice(game.finalPrice)}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-zinc-300">
              {formatPrice(game.finalPrice)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

function TopSellerCard({ game, language, rank }) {
  const { getLanguageConfig } = useTranslation()
  const config = getLanguageConfig(language)

  const formatPrice = (cents) => {
    if (!cents) return language === "pt" ? "Grátis" : "Free"
    return new Intl.NumberFormat(config.numberLocale, {
      style: "currency",
      currency: game.currency || (language === "pt" ? "BRL" : "USD")
    }).format(cents / 100)
  }

  return (
    <a
      href={game.steamUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group w-48 flex-shrink-0 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl"
    >
      <div className="relative h-22 overflow-hidden">
        <img
          src={game.image}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2 bg-zinc-900/90 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-zinc-600/50">
          {rank}
        </div>
        {game.discounted && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
            -{game.discountPercent}%
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
      </div>

      <div className="p-2.5">
        <h3 className="text-sm font-medium text-white truncate group-hover:text-blue-400 transition-colors">
          {game.name}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          {game.discounted ? (
            <>
              <span className="text-xs text-zinc-500 line-through">
                {formatPrice(game.originalPrice)}
              </span>
              <span className="text-sm font-bold text-green-400">
                {formatPrice(game.finalPrice)}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-zinc-300">
              {formatPrice(game.finalPrice)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

export default function SteamSalesSection() {
  const { t, language } = useTranslation("home")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const steamLang = language === "pt" ? "portuguese" : "english"
  const countryCode = language === "pt" ? "br" : "us"

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/steam/sales?cc=${countryCode}&lang=${steamLang}`)
        if (res.ok) {
          setData(await res.json())
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [countryCode, steamLang])

  if (error || (!loading && !data)) return null

  const hasSpotlights = data?.spotlights?.length > 0
  const hasDailyDeal = data?.dailyDeal
  const hasSpecials = data?.specials?.length > 0
  const hasTopSellers = data?.topSellers?.length > 0

  if (!loading && !hasSpotlights && !hasDailyDeal && !hasSpecials && !hasTopSellers) {
    return null
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-white mb-4">Steam</h2>
      {(loading || hasSpotlights) && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t("steam.spotlights")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-72 h-36 flex-shrink-0 bg-zinc-800 rounded-xl animate-pulse" />
              ))
            ) : (
              data.spotlights.map((s, i) => (
                <SpotlightCard key={i} spotlight={s} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}

      {(loading || hasDailyDeal) && (
        <div>
          {loading ? (
            <div className="h-28 bg-zinc-800 rounded-xl animate-pulse" />
          ) : (
            <DailyDealCard game={data.dailyDeal} language={language} />
          )}
        </div>
      )}

      {(loading || hasSpecials) && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4" />
            {t("steam.specials")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SaleCardSkeleton key={i} />
              ))
            ) : (
              data.specials.map((game) => (
                <SaleCard key={game.id} game={game} language={language} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}

      {(loading || hasTopSellers) && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            {t("steam.topSellers")}
          </h3>
          <DragScrollRow className="gap-3 pb-2">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SaleCardSkeleton key={i} />
              ))
            ) : (
              data.topSellers.map((game, i) => (
                <TopSellerCard key={game.id} game={game} language={language} rank={i + 1} />
              ))
            )}
          </DragScrollRow>
        </div>
      )}
    </div>
  )
}