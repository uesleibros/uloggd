import { useState, useEffect, useRef } from "react"
import { Loader2, Check, Gift, ArrowLeft, Search, X } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"
import Modal from "@components/UI/Modal"
import PriceDisplay from "./PriceDisplay"
import AvatarDecorationPreview from "./AvatarDecorationPreview"
import UserDisplay from "@components/User/UserDisplay"
import { MINERALS } from "@components/Minerals/MineralRow"

const followingCache = new Map()

async function fetchAllFollowing(userId) {
  const all = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      userId,
      type: "following",
      page: page.toString(),
      limit: "100",
    })

    const r = await fetch(`/api/users/followers?${params}`)
    const data = await r.json()

    all.push(...(data.users || []))
    hasMore = page < data.totalPages
    page++
  }

  return all
}

function RecipientPicker({ userId, onSelect, onCancel }) {
  const { t } = useTranslation("shop")
  const [users, setUsers] = useState(() => followingCache.get(userId) || [])
  const [loading, setLoading] = useState(!followingCache.has(userId))
  const [query, setQuery] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    if (!userId) return
    if (followingCache.has(userId)) return

    setLoading(true)

    fetchAllFollowing(userId)
      .then(data => {
        followingCache.set(userId, data)
        setUsers(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  const filtered = query
    ? users.filter(u => u.username?.toLowerCase().includes(query.toLowerCase()))
    : users

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-white">{t("gift.selectRecipient")}</h3>
        {!loading && (
          <span className="text-[11px] text-zinc-600 ml-auto">{users.length}</span>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t("gift.searchPlaceholder")}
          className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto overscroll-contain space-y-0.5 rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-zinc-600">
              {query ? t("gift.noResults") : t("gift.noFollowing")}
            </p>
          </div>
        ) : (
          filtered.map(u => (
            <button
              key={u.user_id}
              onClick={() => onSelect(u)}
              className="w-full px-3 py-2 hover:bg-zinc-800/60 transition-colors cursor-pointer text-left flex items-center gap-2.5 rounded-lg group"
            >
              <UserDisplay user={u} size="sm" showBadges={false} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function GiftConfirm({ recipient, item, onConfirm, onCancel, loading }) {
  const { t } = useTranslation("shop")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          disabled={loading}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold text-white">{t("gift.confirmTitle")}</h3>
      </div>

      <div className="p-4 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
        <div className="flex items-center gap-3">
          <Gift className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-zinc-300">
              {t("gift.sendingTo")}{" "}
              <span className="font-semibold text-white">{recipient.username}</span>
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{item.name}</p>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-zinc-800/50">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2 block">
          {t("detail.price")}
        </span>
        <PriceDisplay item={item} size="lg" />
      </div>

      <p className="text-[11px] text-zinc-600 leading-relaxed">{t("gift.disclaimer")}</p>

      <div className="flex gap-2.5">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("detail.close")}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Gift className="w-3.5 h-3.5" />
              {t("gift.confirm")}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function ItemDetailModal({ item, owned, equipped, onClose, onPurchase, onGift, onEquip, purchasing, equipping, gifting, user }) {
  const { t } = useTranslation("shop")
  const [giftStep, setGiftStep] = useState(null)
  const [selectedRecipient, setSelectedRecipient] = useState(null)

  useEffect(() => {
    if (!item) {
      setGiftStep(null)
      setSelectedRecipient(null)
    }
  }, [item])

  if (!item) return null

  const isSoldOut = item.is_limited && item.current_stock === 0
  const hasPrice = MINERALS.some(m => (item[`price_${m.key}`] || 0) > 0)
  const isAvatarDecoration = item.item_type === "avatar_decoration"
  const artists = (item.artists || []).filter(entry => entry?.artist)
  const canGift = user && !isSoldOut && !owned

  function handleStartGift() {
    setGiftStep("pick")
    setSelectedRecipient(null)
  }

  function handleSelectRecipient(recipient) {
    setSelectedRecipient(recipient)
    setGiftStep("confirm")
  }

  function handleCancelGift() {
    setGiftStep(null)
    setSelectedRecipient(null)
  }

  function handleBackToPick() {
    setGiftStep("pick")
    setSelectedRecipient(null)
  }

  function handleConfirmGift() {
    if (!selectedRecipient) return
    onGift(item, selectedRecipient.user_id)
  }

  return (
    <Modal
      isOpen={!!item}
      onClose={giftStep ? handleCancelGift : onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800/80">
        {!giftStep && (
          <div className="relative bg-gradient-to-b from-zinc-800/30 to-zinc-900 flex items-center justify-center p-10 min-h-[220px]">
            {isAvatarDecoration && item.asset_url && user ? (
              <AvatarDecorationPreview item={item} user={user} />
            ) : item.asset_url ? (
              <img
                src={item.asset_url}
                alt={item.name}
                className="max-w-[160px] max-h-[160px] object-contain select-none"
                draggable={false}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-zinc-800/40" />
            )}

            <div className="absolute top-3 left-3 flex gap-1.5">
              {item.is_featured && (
                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-violet-500/15 text-violet-400 rounded">
                  ✦ {t("tags.featured")}
                </span>
              )}
              {item.is_limited && (
                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 rounded">
                  {t("tags.limited")}
                </span>
              )}
              {owned && (
                <span className="px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 rounded flex items-center gap-0.5">
                  <Check className="w-2 h-2" />
                  {t("tags.owned")}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-5">
          {giftStep === "pick" ? (
            <RecipientPicker
              userId={user?.user_id}
              onSelect={handleSelectRecipient}
              onCancel={handleCancelGift}
            />
          ) : giftStep === "confirm" && selectedRecipient ? (
            <GiftConfirm
              recipient={selectedRecipient}
              item={item}
              onConfirm={handleConfirmGift}
              onCancel={handleBackToPick}
              loading={gifting}
            />
          ) : (
            <>
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">
                {t(`types.${item.item_type}`, item.item_type?.replace(/_/g, " "))}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5 mb-1.5">{item.name}</h2>

              {item.description && (
                <p className="text-sm text-zinc-500 leading-relaxed mb-4">{item.description}</p>
              )}

              {artists.length > 0 && (
                <div className="mb-4">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2 block">
                    {t("artists.itemCredits")}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {artists.map(({ artist, is_primary }) => {
                      const content = (
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors">
                          <img
                            src={artist.avatar_url || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            alt={artist.name}
                            className="w-5 h-5 rounded-full object-cover select-none"
                            draggable={false}
                          />
                          <span className="text-xs text-zinc-300">{artist.name}</span>
                          {is_primary && (
                            <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                              {t("artists.primary")}
                            </span>
                          )}
                        </div>
                      )

                      return artist.url ? (
                        <a key={artist.id} href={artist.url} target="_blank" rel="noopener noreferrer">
                          {content}
                        </a>
                      ) : (
                        <div key={artist.id}>{content}</div>
                      )
                    })}
                  </div>
                </div>
              )}

              {item.is_limited && item.max_stock != null && !owned && (
                <p className="text-xs text-zinc-500 mb-4">
                  {isSoldOut
                    ? t("detail.soldOutLabel")
                    : `${item.current_stock} / ${item.max_stock} ${t("detail.remaining")}`}
                </p>
              )}

              {item.available_until && !owned && (
                <p className="text-xs text-zinc-500 mb-4">
                  {t("detail.availableUntil")} {new Date(item.available_until).toLocaleDateString()}
                </p>
              )}

              {!owned && hasPrice && (
                <div className="p-3.5 rounded-lg bg-zinc-800/50 mb-5">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium mb-2 block">
                    {t("detail.price")}
                  </span>
                  <PriceDisplay item={item} size="lg" />
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                >
                  {t("detail.close")}
                </button>

                {owned ? (
                  equipped ? (
                    <div className="flex-1 px-4 py-2.5 text-sm font-medium text-emerald-400/80 bg-emerald-500/10 rounded-lg flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {t("detail.equipped")}
                    </div>
                  ) : (
                    <button
                      onClick={onEquip}
                      disabled={equipping}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {equipping ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        t("detail.equip")
                      )}
                    </button>
                  )
                ) : isSoldOut ? (
                  <div className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-800/50 rounded-lg flex items-center justify-center">
                    {t("detail.soldOut")}
                  </div>
                ) : user ? (
                  <div className="flex-1 flex gap-2">
                    <button
                      onClick={() => onPurchase(item)}
                      disabled={purchasing || gifting}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {purchasing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        t("detail.purchase")
                      )}
                    </button>
                    <button
                      onClick={handleStartGift}
                      disabled={purchasing || gifting}
                      className="px-3 py-2.5 text-sm font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
                      title={t("gift.buttonTitle")}
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 bg-zinc-800/50 rounded-lg flex items-center justify-center text-center">
                    {t("detail.loginRequired")}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
