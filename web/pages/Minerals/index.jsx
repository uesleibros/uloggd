import { useState } from "react"
import { Gem, Gift, MessageSquare, Heart, Trophy, ChevronRight } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import Modal from "@components/UI/Modal"
import DailyChest from "@components/Minerals/DailyChest"
import { MINERALS } from "@components/Minerals/MineralRow"

const MINERALS_DATA = MINERALS.map((mineral) => ({
  ...mineral,
  ...{
    copper: { rarity: "common", dropRate: 100 },
    iron: { rarity: "uncommon", dropRate: 60 },
    gold: { rarity: "rare", dropRate: 25 },
    emerald: { rarity: "epic", dropRate: 8 },
    diamond: { rarity: "legendary", dropRate: 2 },
    ruby: { rarity: "mythic", dropRate: 0.5 },
  }[mineral.key],
}))

const HOW_TO_OBTAIN = [
  { key: "dailyChest", icon: Gift, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { key: "reviews", icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { key: "likes", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  { key: "events", icon: Trophy, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
]

const RARITY_STYLES = {
  common: { bg: "bg-zinc-500/10", border: "border-zinc-500/30", text: "text-zinc-400" },
  uncommon: { bg: "bg-zinc-400/10", border: "border-zinc-400/30", text: "text-zinc-300" },
  rare: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
  epic: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  legendary: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
  mythic: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
}

function MineralCard({ mineral, onClick }) {
  const { t } = useTranslation("minerals")
  const rarity = RARITY_STYLES[mineral.rarity]

  return (
    <button
      onClick={() => onClick(mineral)}
      className="group w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/40 border border-transparent hover:border-zinc-700/50 transition-all cursor-pointer text-left"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform bg-zinc-800/50 border border-zinc-700/50">
        <img src={mineral.image} alt={t(`items.${mineral.key}.name`)} className="w-6 h-6 object-contain" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white group-hover:text-white/90">
            {t(`items.${mineral.key}.name`)}
          </h3>
          <span className={`text-xs px-1.5 py-0.5 rounded ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
            {t(`rarity.${mineral.rarity}`)}
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
          {t(`items.${mineral.key}.description`)}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
    </button>
  )
}

function MineralModal({ mineral, isOpen, onClose }) {
  const { t } = useTranslation("minerals")

  if (!mineral) return null

  const rarity = RARITY_STYLES[mineral.rarity]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-zinc-800/50 border border-zinc-700/50">
            <img src={mineral.image} alt={t(`items.${mineral.key}.name`)} className="w-10 h-10 object-contain" />
          </div>

          <h3 className="text-xl font-semibold text-white mb-1">
            {t(`items.${mineral.key}.name`)}
          </h3>

          <span className={`text-xs px-2 py-1 rounded-full ${rarity.bg} ${rarity.text} border ${rarity.border} mb-3`}>
            {t(`rarity.${mineral.rarity}`)}
          </span>

          <p className="text-sm text-zinc-400 leading-relaxed">
            {t(`items.${mineral.key}.description`)}
          </p>

          <div className="w-full mt-6 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">{t("modal.dropRate")}</span>
              <span className="font-medium text-zinc-100">
                {mineral.dropRate}%
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
          >
            {t("modal.close")}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function HowToObtainSection() {
  const { t } = useTranslation("minerals")

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Gift className="w-4 h-4 text-zinc-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{t("howToObtain.title")}</h2>
          <p className="text-xs text-zinc-600">{t("howToObtain.subtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HOW_TO_OBTAIN.map((method) => {
          const Icon = method.icon
          return (
            <div
              key={method.key}
              className="flex items-start gap-3 p-4 rounded-xl bg-zinc-800/20 border border-zinc-700/30"
            >
              <div className={`w-10 h-10 rounded-lg ${method.bg} border ${method.border} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${method.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">
                  {t(`howToObtain.methods.${method.key}.title`)}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t(`howToObtain.methods.${method.key}.description`)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AllMineralsSection({ onMineralClick }) {
  const { t } = useTranslation("minerals")

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
          <Gem className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{t("allMinerals.title")}</h2>
          <p className="text-xs text-zinc-600">{t("allMinerals.subtitle")}</p>
        </div>
      </div>

      <div className="space-y-1">
        {MINERALS_DATA.map((mineral) => (
          <MineralCard
            key={mineral.key}
            mineral={mineral}
            onClick={onMineralClick}
          />
        ))}
      </div>
    </div>
  )
}

export default function Minerals() {
  const { t } = useTranslation("minerals")
  const { user } = useAuth()
  const [activeMineral, setActiveMineral] = useState(null)

  usePageMeta({
    title: t("meta.title"),
    description: t("meta.description"),
  })

  return (
    <div className="py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-2">{t("page.title")}</h1>
        <p className="text-sm text-zinc-500">{t("page.subtitle")}</p>
      </div>

      {user && <DailyChest />}

      <HowToObtainSection />

      <AllMineralsSection onMineralClick={setActiveMineral} />

      <MineralModal
        mineral={activeMineral}
        isOpen={!!activeMineral}
        onClose={() => setActiveMineral(null)}
      />
    </div>
  )
}
