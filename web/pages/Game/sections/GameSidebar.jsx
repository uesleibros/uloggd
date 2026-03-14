import { useState } from "react"
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
import { AgeRatings } from "../components/AgeRatings"
import { Websites } from "../components/Websites"
import { Keywords } from "../components/Keywords"
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
      className={`relative w-12 h-16 rounded overflow-hidden border-2 transition-all duration-200 cursor-pointer flex-shrink-0 ${
        isActive
          ? "border-blue-500 ring-1 ring-blue-500/50"
          : "border-zinc-700 hover:border-zinc-500"
      }`}
    >
      <img src={url} alt="" className="w-full h-full object-cover" />
      {isSaved && (
        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
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
            className="w-12 h-16 rounded flex items-center justify-center bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 cursor-pointer flex-shrink-0"
          >
            <div className="text-center">
              <Images className="w-4 h-4 text-blue-400 mx-auto" />
              <span className="text-[10px] text-blue-400 mt-0.5 block">+{covers.length - INITIAL_SHOW}</span>
            </div>
          </button>
        )}
      </div>

      {user && hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
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
                onClick={() => { onSelect(url); setShowModal(false) }}
                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                  activeCover === url
                    ? "border-blue-500 ring-2 ring-blue-500/50 scale-95"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {savedCover === url && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
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

function SidebarCover({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-32 sm:w-48 md:w-64 rounded-lg shadow-2xl bg-zinc-800 select-none flex-shrink-0"
      />
    )
  }

  return (
    <div className="w-32 h-48 sm:w-48 sm:h-72 md:w-64 md:h-96 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
      <span className="text-zinc-500 text-xs sm:text-sm text-center px-2">{name}</span>
    </div>
  )
}

function MobileHeader({ game }) {
  const { t } = useTranslation("game")
  const { formatDateLong } = useDateTime()

  return (
    <div className="flex-1 min-w-0 md:hidden">
      <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{game.name}</h1>
      {game.first_release_date && (
        <p className="text-xs sm:text-sm text-zinc-400 mt-1.5">
          {formatDateLong(game.first_release_date)}
        </p>
      )}
      <div className="flex gap-4 mt-3">
        <RatingBadge score={game.total_rating} label={t("sidebar.ratings.total")} size="sm" />
        <RatingBadge score={game.aggregated_rating} label={t("sidebar.ratings.critics")} size="sm" />
        <RatingBadge score={game.rating} label={t("sidebar.ratings.users")} size="sm" />
      </div>
    </div>
  )
}

function ParentGameLink({ parentGame }) {
  const { t } = useTranslation("game")
  const { getGameData } = useMyLibrary()

  if (!parentGame) return null

  const parentData = getGameData(parentGame.slug)
  const coverUrl = parentData?.customCoverUrl || (parentGame.cover?.url ? `https:${parentGame.cover.url}` : null)

  return (
    <>
      <Link
        to={`/game/${parentGame.slug}`}
        className="mt-6 flex items-center gap-3 px-4 py-3 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 group"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={parentGame.name}
            className="w-10 h-14 rounded object-cover bg-zinc-700 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-14 rounded bg-zinc-700 flex-shrink-0" />
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">{t("sidebar.parentGame")}</span>
          <span className="text-sm text-zinc-300 group-hover:text-white transition-colors truncate">
            {parentGame.name}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white ml-auto flex-shrink-0 transition-colors" />
      </Link>
      <hr className="my-6 border-zinc-700" />
    </>
  )
}

export function GameSidebar({ game }) {
  const { t } = useTranslation("game")
  const { getGameData } = useMyLibrary()

  const gameData = getGameData(game.slug)
  const defaultCover = getCoverUrl(game)
  const userSavedCover = gameData?.customCoverUrl || null
  const initialCover = userSavedCover || defaultCover

  const [activeCover, setActiveCover] = useState(initialCover)
  const [savedCover, setSavedCover] = useState(userSavedCover || defaultCover)

  return (
    <div className="flex-shrink-0">
      <div className="flex flex-row md:flex-col gap-4 md:gap-0">
        <div>
          <SidebarCover url={activeCover} name={game.name} />
          <div className="hidden md:block">
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

      <div className="md:hidden">
        <AlternativeCovers
          game={game}
          covers={game.alternativeCovers}
          activeCover={activeCover}
          savedCover={savedCover}
          onSelect={setActiveCover}
          onSave={setSavedCover}
        />
      </div>

      <div className="mt-4 md:hidden">
        <QuickActions game={game} />
        <ReviewButton game={game} />
      </div>

      <div className="my-4 md:hidden">
        <JournalButton game={game} />
      </div>

      <ParentGameLink parentGame={game.parent_game} />

      {game.ageRatings?.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-white mb-4">{t("sidebar.ageRatings")}</h2>
          <AgeRatings ratings={game.ageRatings} />
        </div>
      )}

      <div>
        <Websites websites={game.websites} />
        <hr className="my-6 border-zinc-700" />

        {game.platforms?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">{t("sidebar.platforms")}</h2>
            <PlatformList
              platforms={game.platforms}
              variant="badge"
              className="max-w-sm"
              badgeClassName="hover:bg-zinc-700/50 transition-colors"
            />
          </div>
        )}

        <Keywords keywords={game.keywords} />
      </div>
    </div>
  )
}
