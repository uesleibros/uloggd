import { Star, Calendar, SlidersHorizontal } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

const TABS = [
  { key: "review", icon: Star, filled: true },
  { key: "dates", icon: Calendar },
  { key: "details", icon: SlidersHorizontal },
]

export function TabNav({ activeTab, setActiveTab }) {
  const { t } = useTranslation("review.tabs")

  return (
    <div className="flex gap-1 pb-0.5">
      {TABS.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap flex-1 sm:flex-initial ${
              activeTab === tab.key
                ? "bg-white text-black"
                : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${tab.filled && activeTab === tab.key ? "fill-current" : ""}`} />
            {t(tab.key)}
          </button>
        )
      })}
    </div>
  )
}
