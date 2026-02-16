import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../../../hooks/useAuth"
import { supabase } from "../../../lib/supabase"
import { notify } from "../UI/Notification"
import BannerEditor from "./BannerEditor"
import UserBadges from "./UserBadges"
import { MarkdownEditor } from "../MarkdownEditor"

function MobileTabButton({ icon, label, active, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer flex-shrink-0 ${
        active
          ? "bg-white text-black"
          : danger
            ? "text-red-400"
            : "text-zinc-400"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function SidebarItem({ icon, label, active, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
        active
          ? "bg-white text-black"
          : danger
            ? "text-red-400 hover:text-red-300 hover:bg-red-500/5"
            : "text-zinc-400 hover:text-white hover:bg-zinc-700/60"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function InfoField({ label, value, icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-zinc-700/50 last:border-0 gap-1 sm:gap-0">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-zinc-600">{icon}</span>}
        <span className="text-sm text-zinc-400">{label}</span>
      </div>
      <span className="text-sm text-zinc-200 font-medium pl-6.5 sm:pl-0">{value || "—"}</span>
    </div>
  )
}

function Badge({ text, color = "zinc" }) {
  const colors = {
    zinc: "bg-zinc-800 text-zinc-400 border-zinc-700",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]}`}>
      {text}
    </span>
  )
}

function SettingsSection({ title, description, children, danger = false }) {
  return (
    <div className={`rounded-xl p-4 sm:p-6 ${
      danger
        ? "bg-red-500/5 border border-red-500/20"
        : "bg-zinc-800/50 border border-zinc-700"
    }`}>
      <h2 className={`text-base font-semibold mb-1 ${danger ? "text-red-400" : "text-white"}`}>
        {title}
      </h2>
      {description && <p className="text-sm text-zinc-500 mb-4 sm:mb-5">{description}</p>}
      {children}
    </div>
  )
}

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuth()
  const [bannerSaving, setBannerSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("account")
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [bio, setBio] = useState(user?.bio || "")
  const [bioSaving, setBioSaving] = useState(false)

  const bioIsDirty = bio !== (user?.bio || "")

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  function handleResetBio() {
    setBio(user?.bio || "")
  }

  async function handleSignOut() {
    setSignOutLoading(true)
    await supabase.auth.signOut()
    onClose()
  }

  async function handleBannerSave(base64) {
    setBannerSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/user/banner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: base64 === null ? "remove" : "upload",
          image: base64,
        }),
      })

      if (res.ok) {
        let newBanner = base64
        try {
          const data = await res.json()
          if (data.url || data.banner) {
            newBanner = data.url || data.banner
          }
        } catch {}

        updateUser({ banner: base64 === null ? null : newBanner })
        notify(base64 === null ? "Banner removido com sucesso!" : "Banner atualizado com sucesso!")
      } else {
        notify("Erro ao salvar o banner. Tente novamente.", "error")
      }
    } catch {
      notify("Erro ao salvar o banner. Tente novamente.", "error")
    } finally {
      setBannerSaving(false)
    }
  }

  async function handleBioSave() {
    if (!bioIsDirty) return

    setBioSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/user/bio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ bio }),
      })

      if (res.ok) {
        updateUser({ bio })
        notify("Bio atualizada com sucesso!")
      } else {
        notify("Erro ao salvar a bio.", "error")
      }
    } catch {
      notify("Erro ao salvar a bio.", "error")
    } finally {
      setBioSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/user/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      })

      if (res.ok) {
        await supabase.auth.signOut()
        window.location.href = "/"
      } else {
        notify("Erro ao excluir a conta. Tente novamente.", "error")
      }
    } catch {
      notify("Erro ao excluir a conta. Tente novamente.", "error")
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!user) return null

  const accountIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )

  const sessionsIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  )

  const appearanceIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
    </svg>
  )

  const signOutIcon = signOutLoading ? (
    <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  )

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full h-full md:w-[860px] md:h-[620px] md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hidden md:flex w-56 flex-shrink-0 bg-zinc-900/80 flex-col border-r border-zinc-700">
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest px-3 mb-3">
              Configurações
            </div>

            <div className="space-y-1">
              <SidebarItem active={activeTab === "account"} onClick={() => setActiveTab("account")} label="Minha conta" icon={accountIcon} />
              <SidebarItem active={activeTab === "sessions"} onClick={() => setActiveTab("sessions")} label="Sessão" icon={sessionsIcon} />
              <SidebarItem active={activeTab === "appearance"} onClick={() => setActiveTab("appearance")} label="Aparência" icon={appearanceIcon} />
            </div>

            <div className="h-px bg-zinc-800 my-3 mx-1" />

            <div className="space-y-1">
              <SidebarItem onClick={handleSignOut} label={signOutLoading ? "Saindo..." : "Sair"} danger icon={signOutIcon} />
            </div>
          </div>
        </div>

        <div className="flex md:hidden items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-700 flex-shrink-0">
          <h1 className="text-base font-semibold text-white">Configurações</h1>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-zinc-700 text-zinc-400 flex items-center justify-center cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex md:hidden items-center gap-1 px-4 py-3 border-b border-zinc-700/50 overflow-x-auto scrollbar-hide flex-shrink-0">
          <MobileTabButton active={activeTab === "account"} onClick={() => setActiveTab("account")} label="Conta" icon={accountIcon} />
          <MobileTabButton active={activeTab === "sessions"} onClick={() => setActiveTab("sessions")} label="Sessão" icon={sessionsIcon} />
          <MobileTabButton active={activeTab === "appearance"} onClick={() => setActiveTab("appearance")} label="Aparência" icon={appearanceIcon} />
          <MobileTabButton onClick={handleSignOut} label={signOutLoading ? "." : "Sair"} danger icon={signOutIcon} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="hidden md:flex absolute top-4 right-4 z-10 flex-col items-center">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:bg-zinc-800/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-[10px] font-bold text-zinc-600 mt-1.5 uppercase tracking-wide">ESC</span>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-8 sm:p-6 md:p-8 md:pr-16">
            {activeTab === "account" && (
              <div>
                <h2 className="text-lg font-semibold text-white">Minha conta</h2>
                <p className="text-sm text-zinc-500 mt-1 mb-6">Informações da sua conta vinculada ao Discord.</p>

                <div className="space-y-4 sm:space-y-6">
                  <SettingsSection
                    title="Banner"
                    description="Personalize o banner do seu perfil. Recomendado: 1500x375px."
                  >
                    <BannerEditor
                      currentBanner={user.banner || null}
                      onSave={handleBannerSave}
                      saving={bannerSaving}
                    />
                  </SettingsSection>

                  <SettingsSection
                    title="Sobre mim"
                    description="Escreva uma bio para o seu perfil. Suporta Markdown."
                  >
                    <MarkdownEditor
                      value={bio}
                      onChange={setBio}
                      maxLength={10000}
                      placeholder="Escreva sobre você..."
                    />
                    <div className="flex justify-end items-center gap-3 mt-3">
                      {bioIsDirty && (
                        <button
                          onClick={handleResetBio}
                          disabled={bioSaving}
                          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Resetar
                        </button>
                      )}
                      
                      <button
                        onClick={handleBioSave}
                        disabled={!bioIsDirty || bioSaving}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                          !bioIsDirty || bioSaving
                            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer shadow-lg shadow-indigo-500/20"
                        }`}
                      >
                        {bioSaving ? (
                          <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        Salvar
                      </button>
                    </div>
                  </SettingsSection>

                  <SettingsSection title="Perfil">
                    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mb-4 sm:mb-5">
                      <div className="relative group cursor-pointer flex-shrink-0">
                        <img
                          src={user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                          alt={user.username}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-zinc-700 select-none object-cover"
                          draggable={false}
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base sm:text-lg font-semibold text-white truncate">{user.username}</span>
                          <UserBadges user={user} size="lg" />
                        </div>
                        <span className="text-xs sm:text-sm text-zinc-500 truncate block mt-0.5">{user.email}</span>
                      </div>
                    </div>

                    <InfoField
                      label="Nome de usuário"
                      value={user.username}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      }
                    />
                    <InfoField
                      label="Email"
                      value={user.email.replace(/(.{2})(.*)(@.*)/, "$1****$3")}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      }
                    />
                    <InfoField
                      label="ID Discord"
                      value={user.discordId}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
                        </svg>
                      }
                    />
                    <InfoField
                      label="Verificação"
                      value={
                        <div className="flex items-center gap-2">
                          <Badge
                            text={user.is_verified ? "Verificado" : "Não verificado"}
                            color={user.is_verified ? "green" : "zinc"}
                          />
                          {user.is_moderator && <Badge text="Moderador" color="blue" />}
                        </div>
                      }
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                      }
                    />
                  </SettingsSection>

                  <SettingsSection
                    title="Zona de perigo"
                    description="Ações irreversíveis. Tenha certeza antes de prosseguir."
                    danger
                  >
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Excluir minha conta
                      </button>
                    ) : (
                      <div className="p-3 sm:p-4 bg-zinc-900/30 border border-red-500/20 rounded-lg space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-red-400">Tem certeza absoluta?</p>
                            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                              Essa ação é irreversível. Todos os seus dados, incluindo jogos salvos, avaliações, seguidores e listas serão permanentemente excluídos.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {deleteLoading ? (
                              <div className="h-4 w-4 border-2 border-red-300 border-t-white rounded-full animate-spin" />
                            ) : (
                              "Excluir permanentemente"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </SettingsSection>
                </div>
              </div>
            )}

            {activeTab === "sessions" && (
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
                    onClick={handleSignOut}
                    disabled={signOutLoading}
                    className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {signOutLoading ? (
                      <div className="h-4 w-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                    )}
                    Encerrar sessão
                  </button>
                </SettingsSection>
              </div>
            )}

            {activeTab === "appearance" && (
              <div>
                <h2 className="text-lg font-semibold text-white">Aparência</h2>
                <p className="text-sm text-zinc-500 mt-1 mb-6">Defina como o uloggd aparece para você.</p>

                <SettingsSection title="Tema">
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center text-zinc-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
                      </svg>
                    </div>
                    <p className="text-sm text-zinc-500">Configurações de aparência em breve.</p>
                  </div>
                </SettingsSection>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}