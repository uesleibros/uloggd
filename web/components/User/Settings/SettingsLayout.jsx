import { User, Monitor, Palette, LogOut, X, Loader2, ArrowDownToLine, Link2 } from "lucide-react"
import SidebarItem from "@components/User/Settings/ui/SidebarItem"
import MobileTabButton from "@components/User/Settings/ui/MobileTabButton"

const TABS = [
  { id: "account", label: "Minha conta", mobile: "Conta", icon: User },
  { id: "sessions", label: "Sessão", mobile: "Sessão", icon: Monitor },
  { id: "appearance", label: "Aparência", mobile: "Aparência", icon: Palette },
  { id: "connections", label: "Conexões", mobile: "Conexões", icon: Link2 },
  { id: "integrations", label: "Integrações", mobile: "Integrações", icon: ArrowDownToLine },
]

export default function SettingsLayout({ activeTab, onTabChange, onClose, onSignOut, signOutLoading, children }) {
  const signOutIcon = signOutLoading
    ? <Loader2 className="w-4 h-4 animate-spin" />
    : <LogOut className="w-4 h-4" />

  return (
    <div className="relative w-full h-full md:w-[860px] md:h-[620px] md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:flex w-56 flex-shrink-0 bg-zinc-900/80 flex-col border-r border-zinc-700">
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-3">Configurações</div>
          <div className="space-y-1">
            {TABS.map(tab => (
              <SidebarItem
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => onTabChange(tab.id)}
                label={tab.label}
                icon={<tab.icon className="w-4 h-4" />}
              />
            ))}
          </div>
          <div className="h-px bg-zinc-800 my-3 mx-1" />
          <SidebarItem onClick={onSignOut} label={signOutLoading ? "Saindo..." : "Sair"} danger icon={signOutIcon} />
        </div>
      </div>

      <div className="flex md:hidden items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-700 flex-shrink-0">
        <h1 className="text-base font-semibold text-white">Configurações</h1>
        <button onClick={onClose} className="w-8 h-8 rounded-full border border-zinc-700 text-zinc-400 flex items-center justify-center cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex md:hidden px-4 py-3 border-b border-zinc-700/50 flex-shrink-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 w-max">
          {TABS.map(tab => (
            <MobileTabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              label={tab.mobile}
              icon={<tab.icon className="w-4 h-4" />}
            />
          ))}
          <MobileTabButton onClick={onSignOut} label={signOutLoading ? "..." : "Sair"} danger icon={signOutIcon} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div className="hidden md:flex absolute top-4 right-4 z-10 flex-col items-center">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:bg-zinc-800/50"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-bold text-zinc-600 mt-1.5 uppercase tracking-wide">ESC</span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-8 sm:p-6 md:p-8 md:pr-16">
          {children}
        </div>
      </div>
    </div>
  )
}
