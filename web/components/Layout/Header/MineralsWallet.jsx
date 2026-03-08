import { useState, useEffect, useRef } from "react"
import { Gem } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { MINERALS, MineralRow } from "@components/Minerals/MineralRow"

export default function MineralsWallet({ minerals = {} }) {
  const { t } = useTranslation("minerals")
  const { refreshUser } = useAuth()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  const total = MINERALS.reduce((sum, m) => sum + (minerals[m.key] || 0), 0)

  useEffect(() => {
    function handleMineralsUpdated() {
      refreshUser()
    }

    window.addEventListener("minerals-updated", handleMineralsUpdated)
    return () => window.removeEventListener("minerals-updated", handleMineralsUpdated)
  }, [refreshUser])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="minerals-wallet"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
          open
            ? "bg-zinc-800 ring-1 ring-zinc-700"
            : "hover:bg-zinc-800/60"
        }`}
      >
        <Gem className="w-4 h-4 text-purple-400" />
        <span className="text-sm text-white font-medium tabular-nums">
          {total.toLocaleString()}
        </span>
      </button>

      <div
        className={`absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-black/40 transition-all duration-200 origin-top-right z-50 ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="px-3 py-2.5 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">{t("title")}</span>
            </div>
            <span className="text-xs text-zinc-500">
              {total.toLocaleString()} {t("total")}
            </span>
          </div>
        </div>

        <div className="p-1.5">
          {MINERALS.map((mineral) => (
            <MineralRow
              key={mineral.key}
              mineral={mineral}
              amount={minerals[mineral.key] || 0}
              size="md"
            />
          ))}
        </div>
      </div>
    </div>
  )
}