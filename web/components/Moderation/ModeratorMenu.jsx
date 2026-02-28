import { useState, useRef, useEffect } from "react"
import { Shield, BadgeCheck, Ban, CheckCircle, ChevronRight } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import VerificationRequestsModal from "./VerificationRequestsModal"
import BanUserModal from "./BanUserModal"
import { supabase } from "#lib/supabase"
import { notify } from "@components/UI/Notification"

export default function ModeratorMenu({ profile, currentUser }) {
  const { t } = useTranslation("moderation.menu")
  const [open, setOpen] = useState(false)
  const [showVerifications, setShowVerifications] = useState(false)
  const [showBan, setShowBan] = useState(false)
  const menuRef = useRef(null)

  const isModerator = currentUser?.is_moderator
  const isBanned = profile?.is_banned

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!isModerator) return null

  async function handleUnban() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const res = await fetch("/api/moderation/unban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: profile.id }),
      })

      if (res.ok) {
        notify(t("unbanSuccess"), "success")
        window.location.reload()
      } else {
        notify(t("unbanError"), "error")
      }
    } catch {
      notify(t("unbanError"), "error")
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className={`
            p-2 rounded-lg transition-all cursor-pointer
            ${open
              ? "text-amber-400 bg-amber-500/10"
              : "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
            }
          `}
          title={t("title")}
        >
          <Shield className="w-5 h-5" />
        </button>

        <div
          className={`
            absolute right-0 top-full mt-2 w-52
            bg-zinc-900/95 backdrop-blur-xl border border-zinc-800
            rounded-xl shadow-xl shadow-black/20 z-50 overflow-hidden
            transition-all duration-200 origin-top-right
            ${open
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            }
          `}
        >
          <div className="p-1.5">
            <button
              onClick={() => {
                setOpen(false)
                setShowVerifications(true)
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="w-4 h-4 text-violet-400" />
                <span>{t("verifications")}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </button>

            <div className="my-1.5 mx-3 h-px bg-zinc-800/80" />

            {isBanned ? (
              <button
                onClick={() => {
                  setOpen(false)
                  handleUnban()
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>{t("unban")}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setOpen(false)
                  setShowBan(true)
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Ban className="w-4 h-4" />
                  <span>{t("ban")}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-red-500/50 group-hover:text-red-400 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>

      <VerificationRequestsModal
        isOpen={showVerifications}
        onClose={() => setShowVerifications(false)}
        profile={profile}
      />

      <BanUserModal
        isOpen={showBan}
        onClose={() => setShowBan(false)}
        profile={profile}
      />
    </>
  )
}
