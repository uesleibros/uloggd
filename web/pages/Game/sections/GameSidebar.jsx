import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Images, Check } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import { useAuth } from "#hooks/useAuth"
import { useMyLibrary } from "#hooks/useMyLibrary"
import { supabase } from "#lib/supabase"
import { PlatformList } from "@components/Game/PlatformBadge"
import RatingBadge from "@components/Game/RatingBadge"
import QuickActions from "@components/Game/QuickActions"
import ReviewButton from "@components/Game/Review"
import JournalButton from "@components/Game/Journal"
import Modal from "@components/UI/Modal"
import { notify } from "@components/UI/Notification"
import GameCover, { getCoverUrl } from "@components/Game/GameCover"
import GameTypeBadge from "@components/Game/GameTypeBadge"
import { AgeRatings } from "../components/AgeRatings"
import { Websites } from "../components/Websites"
import { Keywords } from "../components/Keywords"
import { ParentGameLink } from "./GameHeader"
import { useDateTime } from "#hooks/useDateTime"

async function updateCustomCover(gameId, gameSlug, coverUrl) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("not authenticated")

  const res = await fetch("/api/userGames/@me/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      gameId,
      gameSlug,
      field: "custom_cover_url",
      value: coverUrl,
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || "fail")
  }

  return res.json()
}

function CoverThumb({ url, isActive, isSaved, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer flex-shrink-0 ${
        isActive
          ? "border-blue-500 ring-1 ring-blue-500/30"
          : "border-zinc-700/50 hover:border-zinc-500"
      }`}
    >
      <img src={url} alt="" className="w-full h-full object-cover" />
      {isSaved && (
        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </button>
  )
}

function AlternativeCovers({ game, covers, activeCover, savedCover, onSelect, onSave }) {
  const { t } = useTranslation("game")
  const { user } = useAuth()
  const { updateGame } = useMyLibrary()
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!covers?.length || covers.length <= 1) return null

  const INITIAL_SHOW = 4
  const hasMore = covers.length > INITIAL_SHOW
  const hasChanges = activeCover !== savedCover

  const handleSave = async () => {
    if (!user || saving) return
    setSaving(true)

    try {
      await updateCustomCover(game.id, game.slug, activeCover)
      updateGame(game.slug, { customCoverUrl: activeCover })
      onSave(activeCover)
      notify(t("sidebar.coverSaved"), "success")
    } catch {
      notify(t("sidebar.coverSaveError"), "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        {covers.slice(0, INITIAL_SHOW).map((url) => (
          <CoverThumb
            key={url}
            url={url}
            isActive={activeCover === url}
            isSaved={savedCover === url}
            onClick={() => onSelect(url)}
          />
        ))}
        {hasMore && (
          <button
            onClick={() => setShowModal(true)}
            className="w-12 h-16 rounded-lg flex items-center justify-center bg-zinc-800/40 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 cursor-pointer flex-shrink-0"
          >
            <div className="text-center">
              <Images className="w-4 h-4 text-blue-400 mx-auto" />
              <span className="text-[10px] text-blue-400 mt-0.5 block font-medium">
                +{covers.length - INITIAL_SHOW}
              </span>
            </div>
          </button>
        )}
      </div>

      {user && hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
        >
          {saving ? t("sidebar.saving") : t("sidebar.saveCover")}
        </button>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t("sidebar.alternativeCovers")}
        subtitle={String(covers.length)}
      >
        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {covers.map((url) => (
              <button
                key={url}
                onClick={() => {
                  onSelect(url)
                  setShowModal(false)
                }}
                className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                  activeCover === url
                    ? "border-blue-500 ring-2 ring-blue-500/30 scale-95"
                    : "border-zinc-700/50 hover:border-zinc-500"
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {savedCover === url && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}

function SidebarCover({ game, customCoverUrl }) {
  if (game) {
    return (
      <div className="relative group">
        <GameCover
          game={game}
          customCoverUrl={customCoverUrl}
          className="w-32 sm:w-48 lg:w-64 rounded-xl shadow-2xl shadow-black/40 flex-shrink-0"
        />
        <div className="absolute inset-0 rounded-xl border border-white/[0.06] pointer-events-none" />
      </div>
    )
  }

  return (
    <div className="w-32 h-48 sm:w-48 sm:h-72 lg:w-64 lg:h-96 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center flex-shrink-0">
      <span className="text-zinc-600 text-xs sm:text-sm text-center px-4">No cover available</span>
    </div>
  )
}

function MobileHeader({ game }) {
  const { t } = useTranslation("game")
  const { formatDateLong } = useDateTime()

  return (
    <div className="flex-1 min-w-0 lg:hidden">
      {game.gameType && game.gameType !== "main" && (
        <div className="mb-2">
          <GameTypeBadge type={game.gameType} />
        </div>
      )}
      <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight line-clamp-2">
        {game.name}
      </h1>
      {game.first_release_date && (
        <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 font-medium">
          {formatDateLong(game.first_release_date)}
        </p>
      )}
      <div className="flex gap-4 mt-4">
        <RatingBadge score={game.total_rating} label={t("sidebar.ratings.total")} size="sm" />
        <RatingBadge score={game.aggregated_rating} label={t("sidebar.ratings.critics")} size="sm" />
        <RatingBadge score={game.rating} label={t("sidebar.ratings.users")} size="sm" />
      </div>
    </div>
  )
}

function SidebarSection({ title, children }) {
  return (
    <div className="py-5 border-t border-zinc-800/60 first:border-t-0 first:pt-0">
      {title && (
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 tracking-tight">{title}</h2>
      )}
      {children}
    </div>
  )
}

export function GameSidebar({ game }) {
  const { t } = useTranslation("game")
  const { getGameData, loaded } = useMyLibrary()

  const gameData = getGameData(game.slug)
  const defaultCover = getCoverUrl(game)
  const userSavedCover = gameData?.customCoverUrl || null

  const [activeCover, setActiveCover] = useState(userSavedCover || defaultCover)
  const [savedCover, setSavedCover] = useState(userSavedCover || defaultCover)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (loaded && !initialized) {
      const cover = userSavedCover || defaultCover
      setActiveCover(cover)
      setSavedCover(userSavedCover || defaultCover)
      setInitialized(true)
    }
  }, [loaded, initialized, userSavedCover, defaultCover])

  useEffect(() => {
    setInitialized(false)
  }, [game.slug])

  const hasSidebarContent =
    game.parent_game ||
    game.ageRatings?.length > 0 ||
    game.websites?.length > 0 ||
    game.platforms?.length > 0 ||
    game.keywords?.length > 0

  return (
    <div className="flex-shrink-0 lg:w-64">
      <div className="flex flex-row lg:flex-col gap-4 lg:gap-0">
        <div>
          <SidebarCover game={game} customCoverUrl={activeCover} />
          <div className="hidden lg:block">
            <AlternativeCovers
              game={game}
              covers={game.alternativeCovers}
              activeCover={activeCover}
              savedCover={savedCover}
              onSelect={setActiveCover}
              onSave={setSavedCover}
            />
          </div>
        </div>
        <MobileHeader game={game} />
      </div>

      <div className="lg:hidden">
        <AlternativeCovers
          game={game}
          covers={game.alternativeCovers}
          activeCover={activeCover}
          savedCover={savedCover}
          onSelect={setActiveCover}
          onSave={setSavedCover}
        />
      </div>

      <div className="mt-4 lg:hidden">
        <QuickActions game={game} />
        <ReviewButton game={game} />
      </div>

      <div className="my-4 lg:hidden">
        <JournalButton game={game} />
      </div>

      {hasSidebarContent && (
        <div className="mt-6 lg:mt-8 space-y-0">
          {game.parent_game && (
            <SidebarSection>
              <ParentGameLink parentGame={game.parent_game} />
            </SidebarSection>
          )}

          {game.ageRatings?.length > 0 && (
            <SidebarSection title={t("sidebar.ageRatings")}>
              <AgeRatings ratings={game.ageRatings} />
            </SidebarSection>
          )}

          {game.websites?.length > 0 && (
            <SidebarSection>
              <Websites websites={game.websites} />
            </SidebarSection>
          )}

          {game.platforms?.length > 0 && (
            <SidebarSection title={t("sidebar.platforms")}>
              <PlatformList
                platforms={game.platforms}
                variant="badge"
                className="max-w-sm"
                badgeClassName="hover:bg-zinc-700/50 transition-colors"
              />
            </SidebarSection>
          )}

          {game.keywords?.length > 0 && (
            <SidebarSection>
              <Keywords keywords={game.keywords} />
            </SidebarSection>
          )}
        </div>
      )}
    </div>
  )
}
