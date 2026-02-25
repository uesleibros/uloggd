import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Loader2, CheckCircle, Send } from "lucide-react"
import { supabase } from "#lib/supabase.js"
import usePageMeta from "#hooks/usePageMeta"
import Modal from "@components/UI/Modal"
import { useAuth } from "#hooks/useAuth"

function colorToRGB(colorName) {
  if (typeof document === "undefined") return { r: 161, g: 161, b: 170 }
  const ctx = document.createElement("canvas").getContext("2d")
  ctx.fillStyle = colorName
  const hex = ctx.fillStyle
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16)
  }
}

function getBadgeStyles(color) {
  const { r, g, b } = colorToRGB(color || "gray")
  return {
    gradient: `linear-gradient(135deg, rgba(${r},${g},${b},0.2), rgba(${r},${g},${b},0.05))`,
    border: `rgba(${r},${g},${b},0.3)`,
    glow: `0 0 20px rgba(${r},${g},${b},0.1)`,
    iconBg: `rgba(${r},${g},${b},0.1)`
  }
}

function BadgeModalContent({ badge, onClose }) {
  const s = getBadgeStyles(badge.color)

  return (
    <div
      className="overflow-hidden rounded-2xl bg-zinc-900"
      style={{
        border: `1px solid ${s.border}`,
        boxShadow: `${s.glow}, 0 25px 50px -12px rgba(0,0,0,0.25)`
      }}
    >
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{ background: s.gradient }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{
              background: s.iconBg,
              border: `1px solid ${s.border}`,
              boxShadow: s.glow
            }}
          >
            <img
              src={badge.icon_url}
              alt={badge.title}
              className="w-10 h-10 select-none"
              draggable={false}
            />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">{badge.title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{badge.description}</p>
        </div>
      </div>

      <div className="relative border-t border-zinc-800 px-6 py-4">
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

function VerificationRequestModal({ isOpen, onClose, onSubmit, loading, alreadyRequested }) {
  const [reason, setReason] = useState("")

  function handleSubmit(e) {
    e.preventDefault()
    if (!reason.trim() || loading) return
    onSubmit(reason.trim())
  }

  if (alreadyRequested) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-sm"
        showCloseButton={false}
        className="!border-0 !bg-transparent !shadow-none"
      >
        <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Solicitação pendente</h3>
            <p className="text-sm text-zinc-400">
              Você já enviou uma solicitação de verificação. Nossa equipe está analisando e entrará em contato em breve.
            </p>
          </div>

          <div className="border-t border-zinc-800 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-lg font-bold text-white mb-1">Solicitar verificação</h3>
          <p className="text-sm text-zinc-500">
            Conte-nos por que você deveria receber o selo de verificado.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Sou criador de conteúdo com X seguidores, meu perfil é..."
            rows={4}
            maxLength={500}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-zinc-600">{reason.length}/500</span>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-lg transition-all duration-200 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

function SuccessModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-sm"
      showCloseButton={false}
      className="!border-0 !bg-transparent !shadow-none"
    >
      <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col items-center text-center px-6 pt-8 pb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Solicitação enviada!</h3>
          <p className="text-sm text-zinc-400">
            Nossa equipe irá analisar sua solicitação. Você receberá uma resposta em breve.
          </p>
        </div>

        <div className="border-t border-zinc-800 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function BadgeItem({ badge, onClick }) {
  const s = getBadgeStyles(badge.color)

  return (
    <button
      onClick={() => onClick(badge)}
      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer text-left group"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
        style={{
          background: s.iconBg,
          border: `1px solid ${s.border}`
        }}
      >
        <img
          src={badge.icon_url}
          alt={badge.title}
          className="w-6 h-6 select-none"
          draggable={false}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white">{badge.title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{badge.description}</p>
      </div>
    </button>
  )
}

function VerificationCard({ onClick, isVerified, hasPendingRequest }) {
  if (isVerified) return null

  return (
    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Quer ser verificado?</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Se você é um criador de conteúdo, personalidade ou figura reconhecida na comunidade de jogos, solicite seu selo de verificação.
          </p>
          <button
            onClick={onClick}
            className="mt-3 px-4 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
          >
            {hasPendingRequest ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Ver status
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Solicitar verificação
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Badges() {
  const { user } = useAuth()
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeBadge, setActiveBadge] = useState(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)

  const isVerified = user?.badges?.some(b => b.id === "verified")

  usePageMeta({
    title: "Selos - uloggd",
    description: "Conheça todos os selos disponíveis no uloggd e o que cada um representa."
  })

  useEffect(() => {
    async function fetchData() {
      const [badgesRes, requestRes] = await Promise.all([
        supabase
          .from("badges")
          .select("*")
          .order("idx", { ascending: true }),
        user ? supabase
          .from("verification_requests")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle() : Promise.resolve({ data: null })
      ])

      setBadges(badgesRes.data || [])
      setHasPendingRequest(!!requestRes.data)
      setLoading(false)
    }
    fetchData()
  }, [user])

  async function handleSubmitRequest(reason) {
    if (!user) return
    setSubmitting(true)

    await supabase.from("verification_requests").insert({
      user_id: user.id,
      reason,
      status: "pending"
    })

    setSubmitting(false)
    setShowVerificationModal(false)
    setShowSuccessModal(true)
    setHasPendingRequest(true)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-bold text-white">Selos</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6">
        <p className="text-sm text-zinc-500 mb-6">
          Selos são distintivos especiais que aparecem no perfil dos usuários, representando conquistas, funções ou reconhecimentos na comunidade.
        </p>

        {user && (
          <VerificationCard
            onClick={() => setShowVerificationModal(true)}
            isVerified={isVerified}
            hasPendingRequest={hasPendingRequest}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-1">
            {badges.map((badge) => (
              <BadgeItem
                key={badge.id}
                badge={badge}
                onClick={setActiveBadge}
              />
            ))}
          </div>
        )}
      </main>

      <Modal
        isOpen={!!activeBadge}
        onClose={() => setActiveBadge(null)}
        maxWidth="max-w-xs"
        showCloseButton={false}
        className="!border-0 !bg-transparent !shadow-none"
      >
        {activeBadge && (
          <BadgeModalContent
            badge={activeBadge}
            onClose={() => setActiveBadge(null)}
          />
        )}
      </Modal>

      <VerificationRequestModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSubmit={handleSubmitRequest}
        loading={submitting}
        alreadyRequested={hasPendingRequest}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  )
}
