import { Gift, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export default function GiftSuccessModal({ isOpen, onClose, data }) {
  const { t } = useTranslation("shop")

  if (!data) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80">
        <div className="relative bg-gradient-to-b from-violet-500/10 to-zinc-900 flex items-center justify-center p-10 min-h-[160px]">
          <div className="w-16 h-16 rounded-full bg-violet-500/15 flex items-center justify-center">
            <Gift className="w-7 h-7 text-violet-400" />
          </div>

          <div className="absolute top-3 right-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="p-5 text-center">
          <h2 className="text-lg font-bold text-white mb-1.5">
            {t("gift.success.title")}
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed mb-5">
            {t("gift.success.description", {
              item: data.item?.name,
              recipient: data.recipient?.username,
            })}
          </p>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
          >
            {t("detail.close")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
