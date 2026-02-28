import { useTranslation } from "@hooks/useTranslation"
import { TABS } from "../constants"

export function SearchTabs({ activeTab, onChange, counts }) {
  const { t } = useTranslation("search")

  return (
    <div className="mb-4">
      <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, icon: Icon }) => {
          const count = counts[id] || 0
          const isActive = activeTab === id

          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? "border-white text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(`tabs.${id}`)}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                  isActive
                    ? "bg-zinc-700 text-zinc-200"
                    : "bg-zinc-800 text-zinc-500"
                }`}>
                  {count > 999 ? "999+" : count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}