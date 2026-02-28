import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import usePageMeta from "#hooks/usePageMeta"
import { useAuth } from "#hooks/useAuth"
import { useTranslation } from "@hooks/useTranslation"
import { useGamesBatch } from "#hooks/useGamesBatch"
import { supabase } from "#lib/supabase"
import { encode } from "#utils/shortId.js"
import TierlistEditor from "@components/Tierlist/TierlistEditor"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import {
  ArrowLeft, Save, Lock, Loader2,
  Link as LinkIcon, Check, Calendar, Gamepad2, List,
} from "lucide-react"

const tierlistCache = new Map()
const userGamesCache = new Map()

function TierlistSkeleton() {
  return (
    <div className="py-6 sm:py-10">
      <div className="animate-pulse space-y-5">
        <div className="h-4 w-16 bg-zinc-800 rounded" />
        <div className="space-y-3">
          <div className="h-8 w-56 bg-zinc-800 rounded" />
          <div className="h-4 w-40 bg-zinc-800/50 rounded" />
        </div>
        <div className="space-y-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex border border-zinc-800 rounded-lg overflow-hidden">
              <div className="w-12 sm:w-16 h-16 sm:h-20 bg-zinc-800" />
              <div className="flex-1 bg-zinc-800/30 p-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ShareButton({ tierlistId }) {
  const { t } = useTranslation("common")
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/tierlist/${tierlistId}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="p-2.5 sm:p-2 text-zinc-500 hover:text-white active:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
      title={t("copyLink")}
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <LinkIcon className="w-4 h-4" />}
    </button>
  )
}

export default function TierlistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user: currentUser, loading: authLoading } = useAuth()

  const [tierlist, setTierlist] = useState(null)
  const [tiers, setTiers] = useState([])
  const [items, setItems] = useState([])
  const [userGames, setUserGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingGames, setLoadingGames] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  const fetchedRef = useRef(false)
  const fetchedGamesRef = useRef(false)

  const isOwner = !!(currentUser?.id && !authLoading && tierlist?.user_id === currentUser.id)
  const encodedId = tierlist ? encode(tierlist.id) : id

  const allSlugs = useMemo(() => {
    const fromItems = items.map(i => i.game_slug)
    const fromUserGames = userGames.map(g => g.game_slug)
    return [...new Set([...fromItems, ...fromUserGames])]
  }, [items, userGames])

  const { getGame } = useGamesBatch(allSlugs)

  const untieredGames = useMemo(() => {
    const tieredSlugs = new Set(items.map(i => i.game_slug))
    return userGames.filter(g => !tieredSlugs.has(g.game_slug))
  }, [items, userGames])

  usePageMeta(tierlist ? {
    title: `${tierlist.title} - uloggd`,
    description: tierlist.description || "Tierlist de jogos",
  } : undefined)

  const fetchTierlist = useCallback(async () => {
    if (fetchedRef.current) return

    if (tierlistCache.has(id)) {
      const cached = tierlistCache.get(id)
      setTierlist(cached.tierlist)
      setTiers(cached.tiers)
      setItems(cached.items)
      setLoading(false)
      setInitialLoad(false)
      fetchedRef.current = true
      return
    }

    setLoading(true)
    setError(null)

    try {
      const r = await fetch(`/api/tierlists/get?tierlistId=${id}`)
      if (!r.ok) throw new Error("not found")

      const data = await r.json()

      const tierlistData = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        description: data.description,
        is_public: data.is_public,
        created_at: data.created_at,
        updated_at: data.updated_at,
        owner: data.owner,
      }

      const sortedTiers = (data.tierlist_tiers || []).map(t => ({
        id: t.id,
        label: t.label,
        color: t.color,
        position: t.position,
      }))

      const allItems = (data.tierlist_tiers || []).flatMap(t =>
        (t.tierlist_items || []).map(i => ({ ...i, tier_id: t.id }))
      )

      tierlistCache.set(id, {
        tierlist: tierlistData,
        tiers: sortedTiers,
        items: allItems,
      })

      setTierlist(tierlistData)
      setTiers(sortedTiers)
      setItems(allItems)
      fetchedRef.current = true
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setInitialLoad(false)
    }
  }, [id])

  const fetchUserGames = useCallback(async () => {
    if (!currentUser || fetchedGamesRef.current) return

    const cacheKey = currentUser.id

    if (userGamesCache.has(cacheKey)) {
      setUserGames(userGamesCache.get(cacheKey))
      fetchedGamesRef.current = true
      return
    }

    setLoadingGames(true)
    try {
      const token = (await supabase.auth.getSession())?.data?.session?.access_token
      const r = await fetch("/api/userGames/@me/getAll", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (r.ok) {
        const data = await r.json()
        userGamesCache.set(cacheKey, data)
        setUserGames(data)
        fetchedGamesRef.current = true
      }
    } catch (e) {
      console.error("Failed to fetch user games:", e)
    } finally {
      setLoadingGames(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchedRef.current = false
    fetchTierlist()
  }, [id, fetchTierlist])

  useEffect(() => {
    if (!authLoading && currentUser && tierlist?.user_id === currentUser.id) {
      fetchUserGames()
    }
  }, [authLoading, currentUser, tierlist?.user_id, fetchUserGames])

  useEffect(() => {
    if (!initialLoad && tierlist) {
      setHasChanges(true)
    }
  }, [tiers, items, initialLoad, tierlist])

  async function handleSave() {
    if (!isOwner || saving) return
    setSaving(true)

    try {
      const token = (await supabase.auth.getSession())?.data?.session?.access_token

      const r = await fetch("/api/tierlists/@me/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tierlistId: tierlist.id,
          tiers: tiers.map((t, i) => ({ ...t, position: i })),
          items: items.map((item, i) => ({ ...item, position: i })),
        }),
      })

      if (!r.ok) throw new Error()

      tierlistCache.set(id, {
        tierlist,
        tiers,
        items,
      })

      setHasChanges(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <TierlistSkeleton />

  if (error || !tierlist) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <List className="w-6 h-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{t("tierlist.notFound.title")}</h1>
        <p className="text-sm text-zinc-500">{t("tierlist.notFound.message")}</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">{t("common.backToHome")}</Link>
      </div>
    )
  }

  if (!tierlist.is_public && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
          <Lock className="w-6 h-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-bold text-white">{t("tierlist.private.title")}</h1>
        <p className="text-sm text-zinc-500">{t("tierlist.private.message")}</p>
        <Link to="/" className="text-sm text-zinc-400 hover:text-white transition-colors">{t("common.backToHome")}</Link>
      </div>
    )
  }

  const createdAt = tierlist.created_at
    ? new Date(tierlist.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
    : null

  const totalGames = items.length

  return (
    <div className="py-6 sm:py-8">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 hover:text-white active:text-white transition-colors flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white break-words">{tierlist.title}</h1>
            {tierlist.is_public === false && (
              <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md flex-shrink-0 mt-1.5">
                <Lock className="w-3 h-3" />
                {t("common.private")}
              </span>
            )}
          </div>

          {tierlist.description && (
            <p className="text-sm text-zinc-400 leading-relaxed mb-3">{tierlist.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
            {tierlist.owner && (
              <Link to={`/u/${tierlist.owner.username}`} className="flex items-center gap-1.5 hover:text-white active:text-white transition-colors py-0.5">
                <AvatarWithDecoration
                  size="xs"
                  src={tierlist.owner.avatar}
                  alt={tierlist.owner.username}
                  decoration={tierlist.owner.avatar_decoration}
                />
                {tierlist.owner.username}
              </Link>
            )}
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" />
              {t("tierlist.rankedGames", { count: totalGames })}
            </span>
            {createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {createdAt}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ShareButton tierlistId={encodedId} />

          {isOwner && (
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{t("common.save")}</span>
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-5 sm:pt-6">
        {loadingGames && isOwner ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <TierlistEditor
            tiers={tiers}
            setTiers={setTiers}
            items={items}
            setItems={setItems}
            untieredGames={untieredGames}
            getGame={getGame}
            isEditing={isOwner}
          />
        )}
      </div>
    </div>
  )
}