import { useState, useEffect } from "react"
import { Plus, Trash2, Fingerprint, Loader2 } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import { registerPasskey, listPasskeys, removePasskey } from "#lib/passkey-client"
import { notify } from "@components/UI/Notification"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

export default function PasskeySection() {
  const { t, locale } = useTranslation("settings")
  const [passkeys, setPasskeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deviceName, setDeviceName] = useState("")
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    loadPasskeys()
  }, [])

  async function loadPasskeys() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const data = await listPasskeys(session.access_token)
      setPasskeys(data)
    } catch (err) {
      console.error("Error loading passkeys:", err)
      notify(t("passkey.errors.loadFailed"), "error")
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  function formatDateShort(dateStr) {
    return new Date(dateStr).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
      day: "2-digit",
      month: "short",
    })
  }

  async function handleAddPasskey(e) {
    e.preventDefault()

    if (!deviceName.trim()) {
      notify(t("passkey.errors.emptyName"), "error")
      return
    }

    try {
      setAdding(true)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        notify(t("passkey.errors.notAuthenticated"), "error")
        return
      }

      await registerPasskey(session.access_token, deviceName)
      setDeviceName("")
      await loadPasskeys()

      notify(t("passkey.success.added"))
    } catch (err) {
      console.error("Error adding passkey:", err)

      if (err.name === "NotAllowedError") {
        notify(t("passkey.errors.cancelled"), "error")
      } else if (err.name === "NotSupportedError") {
        notify(t("passkey.errors.notSupported"), "error")
      } else {
        notify(t("passkey.errors.addFailed"), "error")
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleRemovePasskey(id, name) {
    if (!confirm(t("passkey.remove.confirm", { name }))) return

    try {
      setRemovingId(id)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        notify(t("passkey.errors.notAuthenticated"), "error")
        return
      }

      await removePasskey(session.access_token, id)
      await loadPasskeys()

      notify(t("passkey.success.removed"))
    } catch (err) {
      console.error("Error removing passkey:", err)
      notify(t("passkey.errors.removeFailed"), "error")
    } finally {
      setRemovingId(null)
    }
  }

  if (loading) {
    return (
      <SettingsSection title={t("passkey.title")} description={t("passkey.description")}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection title={t("passkey.title")} description={t("passkey.description")}>
      <div className="space-y-3">
        {passkeys.length === 0 ? (
          <div className="text-center py-8 px-4 border border-zinc-700/50 rounded-lg bg-zinc-800/30">
            <Fingerprint className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">
              {t("passkey.empty.title")}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {t("passkey.empty.subtitle")}
            </p>
          </div>
        ) : (
          passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between p-3 sm:p-4 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-lg border border-zinc-700/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {pk.device_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t("passkey.createdAt", { date: formatDate(pk.created_at) })}
                    {pk.last_used_at && (
                      <> • {t("passkey.lastUsed", { date: formatDateShort(pk.last_used_at) })}</>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemovePasskey(pk.id, pk.device_name)}
                disabled={removingId === pk.id}
                className="flex-shrink-0 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removingId === pk.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddPasskey} className="mt-4 pt-4 border-t border-zinc-700/50">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {t("passkey.add.title")}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder={t("passkey.add.placeholder")}
            maxLength={50}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !deviceName.trim()}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {adding ? t("passkey.add.adding") : t("passkey.add.button")}
            </span>
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-3">
          {t("passkey.hint")}
        </p>
      </form>
    </SettingsSection>
  )
}