import { useState } from "react"
import { User, Settings, LogOut } from "lucide-react"
import { supabase } from "#lib/supabase"
import UserDisplay from "@components/User/UserDisplay"
import UserBadges from "@components/User/UserBadges"
import SettingsModal from "@components/User/Settings/SettingsModal"
import { UserDropdown, DropdownItem } from "./UserDropdown"
import { DiscordIcon } from "./icons"

export function AuthButtons({ user, loading, onNavigate, variant = "desktop" }) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: window.location.origin },
      })
      if (error) throw error
    } catch (error) {
      console.error("Error signing in:", error)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      onNavigate?.()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (loading) {
    if (variant === "mobile") {
      return (
        <div className="pt-2 border-t border-zinc-800">
          <div className="h-10 w-full rounded-md bg-zinc-800 animate-pulse" />
        </div>
      )
    }
    return <div className="h-8 w-24 rounded-md bg-zinc-800 animate-pulse" />
  }

  if (variant === "mobile") {
    if (user) {
      return (
        <>
          <div className="pt-3 border-t border-zinc-800 space-y-1">
            <div className="flex items-center gap-3 px-3 py-3 mb-1 bg-zinc-800/40 rounded-lg">
              <UserDisplay user={user} size="lg" showBadges={true} showUsername={false} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white truncate">{user.username}</span>
                  <UserBadges user={user} size="sm" />
                </div>
                <span className="text-xs text-zinc-500 truncate block">{user.email}</span>
              </div>
            </div>

            <DropdownItem
              to={`/u/${user.username}`}
              onClick={onNavigate}
              label="Meu perfil"
              icon={<User className="w-4 h-4" />}
            />
            <DropdownItem
              onClick={() => setSettingsOpen(true)}
              label="Configurações"
              icon={<Settings className="w-4 h-4" />}
            />

            <div className="pt-1 mt-1 border-t border-zinc-800">
              <DropdownItem
                onClick={() => { onNavigate?.(); handleSignOut() }}
                label="Sair"
                variant="danger"
                icon={<LogOut className="w-4 h-4" />}
              />
            </div>
          </div>

          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => {
              setSettingsOpen(false)
              onNavigate?.()
            }}
          />
        </>
      )
    }

    return (
      <div className="pt-2 border-t border-zinc-800">
        <button
          onClick={handleSignIn}
          className="h-10 w-full rounded-md bg-indigo-500 text-sm font-medium text-white flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors cursor-pointer"
        >
          <DiscordIcon className="h-5 w-5" />
          Entrar com Discord
        </button>
      </div>
    )
  }

  if (user) {
    return <UserDropdown user={user} onSignOut={handleSignOut} />
  }

  return (
    <button
      onClick={handleSignIn}
      className="h-8 cursor-pointer px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 text-sm font-medium text-white flex items-center gap-2 transition-colors"
    >
      <DiscordIcon className="h-4 w-4" />
      Entrar
    </button>
  )
}
