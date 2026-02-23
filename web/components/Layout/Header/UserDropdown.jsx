import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { User, Settings, LogOut, ChevronDown } from "lucide-react"
import UserDisplay from "@components/User/UserDisplay"
import UserBadges from "@components/User/UserBadges"
import SettingsModal from "@components/User/Settings/SettingsModal"

function DropdownItem({ to, onClick, icon, label, variant = "default" }) {
  const variants = {
    default: "text-zinc-300 hover:text-white hover:bg-zinc-800/80",
    danger: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
  }

  const content = (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${variants[variant]}`}>
      <span className="w-5 h-5 flex items-center justify-center text-zinc-500">{icon}</span>
      <span>{label}</span>
    </div>
  )

  if (to) {
    return <Link to={to} onClick={onClick}>{content}</Link>
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>
}

export function UserDropdown({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const dropdownRef = useRef(null)

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
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
            open ? "bg-zinc-800 ring-1 ring-zinc-700" : "hover:bg-zinc-800/60"
          }`}
        >
          <UserDisplay user={user} size="sm" showBadges={false} showStatus={true} showUsername={false} />
          <span className="text-sm text-white hidden sm:block max-w-[120px] truncate">{user.username}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        <div
          className={`absolute right-0 mt-2 w-64 rounded-xl bg-zinc-900 border border-zinc-700/80 shadow-2xl shadow-black/40 transition-all duration-200 origin-top-right z-50 ${
            open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-1 pointer-events-none"
          }`}
        >
          <div className="p-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <UserDisplay user={user} size="md" showBadges={true} showStatus={true} showUsername={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">{user.username}</span>
                  <UserBadges user={user} size="sm" />
                </div>
                <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <DropdownItem
              to={`/u/${user.username}`}
              onClick={() => setOpen(false)}
              label="Meu perfil"
              icon={<User className="w-4 h-4" />}
            />
            <DropdownItem
              onClick={() => { setOpen(false); setSettingsOpen(true) }}
              label="Configurações"
              icon={<Settings className="w-4 h-4" />}
            />
          </div>

          <div className="p-1.5 border-t border-zinc-800">
            <DropdownItem
              onClick={() => { setOpen(false); onSignOut() }}
              label="Sair"
              variant="danger"
              icon={<LogOut className="w-4 h-4" />}
            />
          </div>
        </div>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

export { DropdownItem }