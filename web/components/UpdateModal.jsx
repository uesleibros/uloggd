import { RefreshCw } from "lucide-react"
import { useVersionCheck } from "#hooks/useVersionCheck"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export default function UpdateModal() {
  const { t } = useTranslation()
  const { updateAvailable, refresh, dismiss } = useVersionCheck()

  return (
    <Modal
      isOpen={updateAvailable}
      onClose={dismiss}
      maxWidth="max-w-sm"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-7 h-7 text-indigo-400" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          {t("update.title")}
        </h3>

        <p className="text-sm text-zinc-400 mb-6">
          {t("update.description")}
        </p>

        <div className="flex gap-3">
          <button
            onClick={dismiss}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {t("update.dismiss")}
          </button>
          <button
            onClick={refresh}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {t("update.refresh")}
          </button>
        </div>
      </div>
    </Modal>
  )
}
