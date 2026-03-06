import { useState } from "react"
import { User, Loader2, Check, X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"

export default function SetUsernameModal({ isOpen, onSave, saving }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState("")
  const [error, setError] = useState(null)

  function validateUsername(value) {
    if (value.length < 3) {
      return t("setUsername.errors.tooShort")
    }
    if (value.length > 32) {
      return t("setUsername.errors.tooLong")
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return t("setUsername.errors.invalidChars")
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    const trimmed = username.trim()
    const validationError = validateUsername(trimmed)
    
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const success = await onSave(trimmed)
    
    if (!success) {
      setError(t("setUsername.errors.taken"))
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      maxWidth="max-w-md"
      hideCloseButton
    >
      <div className="p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <User className="w-8 h-8 text-indigo-400" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white text-center mb-2">
          {t("setUsername.title")}
        </h2>
        
        <p className="text-sm text-zinc-400 text-center mb-6">
          {t("setUsername.description")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.slice(0, 32))
                  setError(null)
                }}
                placeholder={t("setUsername.placeholder")}
                autoFocus
                disabled={saving}
                className="w-full pl-8 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                <X className="w-4 h-4" />
                {error}
              </p>
            )}
            
            <p className="mt-2 text-xs text-zinc-500">
              {t("setUsername.hint")}
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !username.trim()}
            className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("setUsername.saving")}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {t("setUsername.submit")}
              </>
            )}
          </button>
        </form>
      </div>
    </Modal>
  )
}