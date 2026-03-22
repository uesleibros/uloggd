import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Camera, EyeOff, MoreHorizontal, Pencil, Trash2, Maximize2 } from "lucide-react"
import Upscaler from "upscaler"
import usePageMeta from "#hooks/usePageMeta"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "#hooks/useTranslation"
import { useDateTime } from "#hooks/useDateTime"
import { useMyLibrary } from "#hooks/useMyLibrary"
import { supabase } from "#lib/supabase"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import UserBadges from "@components/User/UserBadges"
import LikeButton from "@components/UI/LikeButton"
import CommentSection from "@components/UI/CommentSection"
import GameCover from "@components/Game/GameCover"

function ScreenshotPageSkeleton() {
  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-16 bg-zinc-800 rounded" />
        <div className="aspect-video bg-zinc-800 rounded-lg" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-800 rounded-full" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-zinc-800 rounded" />
            <div className="h-3 w-24 bg-zinc-800/50 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ScreenshotPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation("screenshots")
  const { getTimeAgo } = useDateTime()
  const { user: currentUser } = useAuth()
  const { getGameData } = useMyLibrary()
  const [screenshot, setScreenshot] = useState(null)
  const [user, setUser] = useState(null)
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [upscaling, setUpscaling] = useState(false)
  const [upscaledImage, setUpscaledImage] = useState(null)
  const [showUpscaled, setShowUpscaled] = useState(false)
  const menuRef = useRef(null)
  const upscalerRef = useRef(null)

  const isOwner = currentUser?.user_id === screenshot?.user_id
  const gameData = game ? getGameData(game.slug) : null

  usePageMeta(
    screenshot && user
      ? {
          title: `${user.username} - Screenshot - uloggd`,
          description: screenshot.caption || `Screenshot de ${user.username}`,
          image: screenshot.image_url,
        }
      : undefined
  )

  useEffect(() => {
    upscalerRef.current = new Upscaler()
    return () => {
      upscalerRef.current = null
    }
  }, [])

  const fetchScreenshot = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const r = await fetch(`/api/screenshots/get?screenshotId=${id}`)
      if (!r.ok) throw new Error("not found")

      const data = await r.json()
      setScreenshot(data.screenshot)
      setUser(data.user)
      setGame(data.game)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchScreenshot()
  }, [fetchScreenshot])

  useEffect(() => {
    if (!showMenu) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMenu])

  async function handleDelete() {
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const r = await fetch("/api/screenshots/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ screenshotId: screenshot.id }),
      })

      if (r.ok) {
        navigate(`/u/${user.username}`, { replace: true })
      }
    } catch {}
    finally { setDeleting(false) }
  }

  async function handleUpscale() {
    if (!screenshot?.image_url || !upscalerRef.current) return
    
    setUpscaling(true)
    try {
      const upscaled = await upscalerRef.current.upscale(screenshot.image_url, {
        output: 'base64',
        patchSize: 64,
        padding: 2,
      })
      setUpscaledImage(upscaled)
      setShowUpscaled(true)
    } catch (error) {
      console.error('Erro ao fazer upscale:', error)
    } finally {
      setUpscaling(false)
    }
  }

  function toggleUpscaled() {
    setShowUpscaled(!showUpscaled)
  }

  if (loading) return <ScreenshotPageSkeleton />

  if (error || !screenshot) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <Camera className="w-6 h-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{t("notFound.title")}</h1>
        <p className="text-sm text-zinc-500">{t("notFound.message")}</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
          {t("notFound.backHome")}
        </Link>
      </div>
    )
  }

  const isSpoilerHidden = screenshot.is_spoiler && !revealed
  const displayImage = showUpscaled && upscaledImage ? upscaledImage : screenshot.image_url

  return (
    <div className="py-6 sm:py-8 max-w-4xl mx-auto">
      <div className="mb-5">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("page.back")}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/u/${user?.username}`} className="flex-shrink-0">
            <AvatarWithDecoration
              src={user?.avatar}
              alt={user?.username}
              decorationUrl={user?.equipped?.avatar_decoration?.asset_url}
              size="md"
            />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/u/${user?.username}`}
                className="text-sm font-semibold text-white hover:text-zinc-300 transition-colors"
              >
                {user?.username}
              </Link>
              <UserBadges user={user} size="sm" clickable />
            </div>
            <span className="text-xs text-zinc-500">{getTimeAgo(screenshot.created_at)}</span>
          </div>
        </div>

        {isOwner && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-30 overflow-hidden">
                <Link
                  to={`/u/${user.username}`}
                  state={{ editScreenshot: screenshot }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  {t("lightbox.edit")}
                </Link>
                {confirmDelete ? (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? t("page.deleting") : t("lightbox.confirmDelete")}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("lightbox.delete")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden">
        {isSpoilerHidden ? (
          <div className="relative aspect-video flex items-center justify-center">
            <img
              src={screenshot.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110"
            />
            <button
              onClick={() => setRevealed(true)}
              className="relative z-10 flex flex-col items-center justify-center gap-3 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-800/80 backdrop-blur flex items-center justify-center group-hover:bg-zinc-700/80 transition-colors">
                <EyeOff className="w-7 h-7 text-zinc-400" />
              </div>
              <span className="text-sm font-medium text-zinc-400">{t("lightbox.revealSpoiler")}</span>
            </button>
          </div>
        ) : (
          <>
            <img
              src={displayImage}
              alt={screenshot.caption || ""}
              className="w-full h-auto"
            />
            
            <div className="absolute bottom-4 right-4 flex gap-2">
              {upscaledImage && (
                <button
                  onClick={toggleUpscaled}
                  className="px-3 py-2 bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur text-white text-xs rounded-lg transition-colors cursor-pointer"
                >
                  {showUpscaled ? "Original" : "HD"}
                </button>
              )}
              
              <button
                onClick={handleUpscale}
                disabled={upscaling}
                className="px-3 py-2 bg-zinc-800/90 hover:bg-zinc-700/90 backdrop-blur text-white text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                {upscaling ? "Processando..." : "Melhorar Qualidade"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {game && (
          <Link
            to={`/game/${game.slug}`}
            className="flex items-center gap-3 p-3 bg-zinc-800/40 hover:bg-zinc-800/60 rounded-lg transition-colors group"
          >
            <GameCover
              game={game}
              customCoverUrl={gameData?.customCoverUrl}
              className="w-10 h-14 rounded flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate group-hover:text-zinc-200 transition-colors">
                {game.name}
              </p>
              <p className="text-xs text-zinc-500">{t("page.viewGame")}</p>
            </div>
          </Link>
        )}

        {screenshot.caption && (
          <p className="text-sm text-zinc-300">{screenshot.caption}</p>
        )}

        <div className="flex items-center gap-4 pt-2">
          <LikeButton
            type="screenshot"
            targetId={screenshot.id}
            currentUserId={currentUser?.user_id}
            variant="icon"
          />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <CommentSection type="screenshot" targetId={String(screenshot.id)} />
      </div>
    </div>
  )
}
