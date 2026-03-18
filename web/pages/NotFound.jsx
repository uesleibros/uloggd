import { Link } from "react-router-dom"
import { Home, Search, ArrowLeft, Gamepad2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import usePageMeta from "#hooks/usePageMeta"

export default function NotFound() {
  const { t } = useTranslation("notFound")

  usePageMeta({
    title: `404 - ${t("title")} - uloggd`,
    description: t("message"),
  })

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center">
          <Gamepad2 className="w-12 h-12 text-zinc-600" />
        </div>
      </div>

      <h1 className="text-8xl sm:text-9xl font-bold bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
        404
      </h1>

      <h2 className="mt-4 text-xl sm:text-2xl font-semibold text-white">
        {t("title")}
      </h2>

      <p className="mt-2 text-sm sm:text-base text-zinc-500 max-w-md">
        {t("message")}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
        <Link
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          {t("backHome")}
        </Link>

        <Link
          to="/search"
          className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          {t("searchGames")}
        </Link>
      </div>

      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 mt-6 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("goBack")}
      </button>
    </div>
  )
}
