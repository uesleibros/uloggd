import { Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export default function PurchaseSuccessModal({ isOpen, onClose, item }) {
  const { t } = useTranslation("shop")

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1.5">{t("success.title")}</h3>
          <p className="text-sm text-zinc-500">
            <span className="text-zinc-300 font-medium">{item?.name}</span>{" "}
            {t("success.description")}
          </p>
        </div>
        <div className="border-t border-zinc-800/60 px-5 py-3.5">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
          >
            {t("success.continue")}
          </button>
        </div>
      </div>
    </Modal>
  )
}