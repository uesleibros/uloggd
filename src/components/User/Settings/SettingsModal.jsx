import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../../../../hooks/useAuth"
import { notify } from "../../UI/Notification"
import * as api from "./api"
import SettingsLayout from "./SettingsLayout"
import AccountTab from "./tabs/AccountTab"
import SessionsTab from "./tabs/SessionsTab"
import AppearanceTab from "./tabs/AppearanceTab"
import IntegrationsTab from "./tabs/IntegrationsTab"

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState("account")
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bio, setBio] = useState(user?.bio || "")
  const [bioSaving, setBioSaving] = useState(false)
  const [pronoun, setPronoun] = useState(user?.pronoun || "")
  const [pronounSaving, setPronounSaving] = useState(false)
  const [selectedDecoration, setSelectedDecoration] = useState(user?.avatar_decoration || null)
  const [decorationSaving, setDecorationSaving] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const bioIsDirty = bio !== (user?.bio || "")
  const pronounIsDirty = pronoun !== (user?.pronoun || "")
  const decorationIsDirty = selectedDecoration !== (user?.avatar_decoration || null)

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  async function handleImageSave(type, base64) {
    const setter = type === "avatar" ? setAvatarSaving : setBannerSaving
    const field = type
    setter(true)
    try {
      const data = await api.uploadImage(type, base64)
      if (data) {
        const newValue = base64 === null ? null : (data.url || data[field] || base64)
        updateUser({ [field]: newValue })
        notify(base64 === null ? `${type === "avatar" ? "Avatar" : "Banner"} removido com sucesso!` : `${type === "avatar" ? "Avatar" : "Banner"} atualizado com sucesso!`)
      } else {
        notify(`Erro ao salvar o ${type}. Tente novamente.`, "error")
      }
    } catch {
      notify(`Erro ao salvar o ${type}. Tente novamente.`, "error")
    } finally {
      setter(false)
    }
  }

  async function handleBioSave() {
    if (!bioIsDirty) return
    setBioSaving(true)
    try {
      const data = await api.updateBio(bio)
      if (data) {
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

  async function handlePronounSave() {
    if (!pronounIsDirty) return
    setPronounSaving(true)
    try {
      const data = await api.updatePronoun(pronoun)
      if (data) {
        updateUser({ pronoun })
        notify("Pronome atualizado com sucesso!")
      } else {
        notify("Erro ao salvar o pronome.", "error")
      }
    } catch {
      notify("Erro ao salvar o pronome.", "error")
    } finally {
      setPronounSaving(false)
    }
  }

  async function handleDecorationSave() {
    if (!decorationIsDirty) return
    setDecorationSaving(true)
    try {
      const data = await api.updateDecoration(selectedDecoration)
      if (data) {
        updateUser({ avatar_decoration: selectedDecoration })
        notify("Decoração atualizada com sucesso!")
      } else {
        notify("Erro ao salvar a decoração.", "error")
      }
    } catch {
      notify("Erro ao salvar a decoração.", "error")
    } finally {
      setDecorationSaving(false)
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true)
    await api.signOut()
    onClose()
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const data = await api.deleteAccount()
      if (data) {
        await api.signOut()
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()}>
        <SettingsLayout
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={onClose}
          onSignOut={handleSignOut}
          signOutLoading={signOutLoading}
        >
          {activeTab === "account" && (
            <AccountTab
              user={user}
              onAvatarSave={(b64) => handleImageSave("avatar", b64)}
              avatarSaving={avatarSaving}
              onBannerSave={(b64) => handleImageSave("banner", b64)}
              bannerSaving={bannerSaving}
              bio={bio}
              onBioChange={setBio}
              onBioSave={handleBioSave}
              onBioReset={() => setBio(user?.bio || "")}
              bioSaving={bioSaving}
              bioIsDirty={bioIsDirty}
              pronoun={pronoun}
              onPronounChange={setPronoun}
              onPronounSave={handlePronounSave}
              onPronounReset={() => setPronoun(user?.pronoun || "")}
              pronounSaving={pronounSaving}
              pronounIsDirty={pronounIsDirty}
              onDelete={handleDelete}
              deleteLoading={deleteLoading}
            />
          )}
          {activeTab === "sessions" && (
            <SessionsTab onSignOut={handleSignOut} loading={signOutLoading} />
          )}
          {activeTab === "appearance" && (
            <AppearanceTab
              user={user}
              selectedDecoration={selectedDecoration}
              onSelectDecoration={setSelectedDecoration}
              onDecorationSave={handleDecorationSave}
              onDecorationReset={() => setSelectedDecoration(user?.avatar_decoration || null)}
              decorationSaving={decorationSaving}
              decorationIsDirty={decorationIsDirty}
            />
          )}
          {activeTab === "integrations" && (
            <IntegrationsTab />
          )}
        </SettingsLayout>
      </div>
    </div>,
    document.body
  )
}