import { useState } from "react"
import { Link } from "react-router-dom"
import { User, Settings, LogOut, Package } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { supabase } from "#lib/supabase"
import UserDisplay from "@components/User/UserDisplay"
import UserBadges from "@components/User/UserBadges"
import SettingsModal from "@components/User/Settings/SettingsModal"
import InventoryModal from "@components/User/Inventory/InventoryModal"
import { UserDropdown, DropdownItem } from "./UserDropdown"

export function AuthButtons({ user, loading, onNavigate, variant = "desktop" }) {
  const { t } = useTranslation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)

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
              label={t("auth.profile")}
              icon={<User className="w-4 h-4" />}
            />
            <DropdownItem
              onClick={() => setInventoryOpen(true)}
              label={t("auth.inventory")}
              icon={<Package className="w-4 h-4" />}
            />
            <DropdownItem
              onClick={() => setSettingsOpen(true)}
              label={t("auth.settings")}
              icon={<Settings className="w-4 h-4" />}
            />

            <div className="pt-1 mt-1 border-t border-zinc-800">
              <DropdownItem
                onClick={() => { onNavigate?.(); handleSignOut() }}
                label={t("auth.signOut")}
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
          <InventoryModal
            isOpen={inventoryOpen}
            onClose={() => {
              setInventoryOpen(false)
              onNavigate?.()
            }}
          />
        </>
      )
    }

    return (
      <div className="pt-2 border-t border-zinc-800">
        <Link
          to="/auth"
          onClick={onNavigate}
          className="h-10 w-full rounded-md bg-white text-sm font-semibold text-black flex items-center justify-center hover:bg-zinc-200 transition-colors"
        >
          {t("auth.page.signInButton")}
        </Link>
      </div>
    )
  }

  if (user) {
    return <UserDropdown user={user} onSignOut={handleSignOut} />
  }

  return (
    <Link
      to="/auth"
      className="h-8 px-5 rounded-md bg-white hover:bg-zinc-200 text-sm font-semibold text-black flex items-center transition-colors"
    >
      {t("auth.page.signInButton")}
    </Link>
  )
}
