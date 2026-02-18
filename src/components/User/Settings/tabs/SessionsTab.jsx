import { LogOut, Loader2 } from "lucide-react"
import SettingsSection from "../ui/SettingsSection"
import Badge from "../ui/Badge"

export default function SessionsTab({ onSignOut, loading }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Sessão</h2>
      <p className="text-sm text-zinc-500 mt-1 mb-6">Gerencie sua sessão ativa.</p>

      <SettingsSection title="Sessão atual">
        <div className="flex items-center gap-3 p-3.5 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mb-5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-300 font-medium">Sessão ativa</p>
            <p className="text-xs text-zinc-600 mt-0.5">Navegador atual</p>
          </div>
          <Badge text="Ativa" color="green" />
        </div>

        <button
          onClick={onSignOut}
          disabled={loading}
          className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Encerrar sessão
        </button>
      </SettingsSection>
    </div>
  )
}