import { useState } from "react"
import { Gem } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import { MINERALS, MineralRow } from "./MineralRow"

function MineralsModalContent({ minerals }) {
  const { t } = useTranslation("minerals")

  return (
    <div className="p-2">
      {MINERALS.map((mineral) => (
        <MineralRow
          key={mineral.key}
          mineral={mineral}
          name={t(mineral.key)}
          amount={minerals[mineral.key] || 0}
          size="lg"
        />
      ))}
    </div>
  )
}

export function MineralsDisplay({ minerals = {}, username, isOwnProfile }) {
  const { t } = useTranslation("minerals")
  const [showModal, setShowModal] = useState(false)
  
  const total = MINERALS.reduce((sum, m) => sum + (minerals[m.key] || 0), 0)

  const modalTitle = isOwnProfile 
    ? t("title") 
    : t("titleUser", { username })

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:bg-zinc-700/50 hover:border-zinc-600 transition-colors cursor-pointer"
      >
        <Gem className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-medium text-zinc-300 tabular-nums">
          {total.toLocaleString()}
        </span>
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
        subtitle={`${total.toLocaleString()} ${t("total")}`}
      >
        <MineralsModalContent minerals={minerals} />
      </Modal>
    </>
  )
}