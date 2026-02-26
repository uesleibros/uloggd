import { useState, useEffect } from "react"
import { supabase } from "#lib/supabase.js"
import { Loader2, CheckCircle, Send, ChevronRight, Award, Users, Shield } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import Modal from "@components/UI/Modal"
import BadgeModal from "@components/Badge/BadgeModal"
import { useAuth } from "#hooks/useAuth"
import { notify } from "@components/UI/Notification"
import { getBadgeStyles } from "#utils/badgeStyles"

const CATEGORY_META = {
	team: {
		title: "Equipe",
		description: "Membros oficiais da equipe uloggd",
		icon: Shield,
		order: 0,
	},
	community: {
		title: "Comunidade",
		description: "Reconhecimentos da comunidade",
		icon: Users,
		order: 1,
	},
}

function VerificationRequestModal({ isOpen, onClose, onSubmit, loading, alreadyRequested }) {
	const [reason, setReason] = useState("")

	useEffect(() => {
		if (!isOpen) setReason("")
	}, [isOpen])

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
						<div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
							<CheckCircle className="w-7 h-7 text-amber-500" />
						</div>
						<h3 className="text-lg font-semibold text-white mb-2">Solicitação em análise</h3>
						<p className="text-sm text-zinc-500 leading-relaxed">
							Sua solicitação está sendo avaliada pela equipe. Você será notificado quando houver uma atualização.
						</p>
					</div>

					<div className="border-t border-zinc-800 px-6 py-4">
						<button
							onClick={onClose}
							className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
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
					<h3 className="text-lg font-semibold text-white mb-1">Solicitar verificação</h3>
					<p className="text-sm text-zinc-500">
						Descreva sua atuação na comunidade de games.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="px-6 pb-6">
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Ex: Sou jogador ativo há 5 anos, participo de comunidades de RPG, criador de conteúdo com 10k seguidores..."
						rows={4}
						maxLength={500}
						className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
					/>
					<div className="flex justify-end mt-2">
						<span className="text-xs text-zinc-600">{reason.length}/500</span>
					</div>

					<div className="flex gap-3 mt-4">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all cursor-pointer"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={!reason.trim() || loading}
							className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
					<div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
						<CheckCircle className="w-7 h-7 text-emerald-500" />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">Solicitação enviada</h3>
					<p className="text-sm text-zinc-500 leading-relaxed">
						Você receberá uma notificação quando sua solicitação for analisada.
					</p>
				</div>

				<div className="border-t border-zinc-800 px-6 py-4">
					<button
						onClick={onClose}
						className="w-full px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all cursor-pointer"
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
			className="group w-full flex items-center gap-4 p-4 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/40 border border-transparent hover:border-zinc-700/50 transition-all cursor-pointer text-left"
		>
			<div
				className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
				style={{
					background: s.iconBg,
					border: `1px solid ${s.border}`,
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
				<h3 className="text-sm font-medium text-white group-hover:text-white/90">{badge.title}</h3>
				<p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{badge.description}</p>
			</div>

			<ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
		</button>
	)
}

function BadgeCategory({ categoryKey, badges, onBadgeClick }) {
	const meta = CATEGORY_META[categoryKey] || {
		title: categoryKey,
		description: "",
		icon: Award,
	}
	const Icon = meta.icon

	if (badges.length === 0) return null

	return (
		<div className="mb-8 last:mb-0">
			<div className="flex items-center gap-3 mb-4">
				<div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
					<Icon className="w-4 h-4 text-zinc-400" />
				</div>
				<div>
					<h2 className="text-sm font-semibold text-white">{meta.title}</h2>
					<p className="text-xs text-zinc-600">{meta.description}</p>
				</div>
			</div>

			<div className="space-y-1">
				{badges.map((badge) => (
					<BadgeItem
						key={badge.id}
						badge={badge}
						onClick={onBadgeClick}
					/>
				))}
			</div>
		</div>
	)
}

function VerificationBanner({ onClick, isVerified, hasPendingRequest }) {
	if (isVerified) return null

	return (
		<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-zinc-900 border border-violet-500/20 p-6 mb-10">
			<div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />

			<div className="relative">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-2">
							<Award className="w-5 h-5 text-violet-400" />
							<h3 className="text-base font-semibold text-white">Verificação de perfil</h3>
						</div>
						<p className="text-sm text-zinc-400 leading-relaxed max-w-md">
							Criadores de conteúdo, membros ativos da comunidade e figuras públicas podem solicitar o selo de verificação.
						</p>
					</div>

					<button
						onClick={onClick}
						className="flex-shrink-0 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
					>
						{hasPendingRequest ? (
							<>
								<CheckCircle className="w-4 h-4" />
								<span className="hidden sm:inline">Em análise</span>
							</>
						) : (
							<>
								<Send className="w-4 h-4" />
								<span className="hidden sm:inline">Solicitar</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

function groupBadgesByCategory(badges) {
	const grouped = badges.reduce((acc, badge) => {
		const cat = badge.category || "community"
		if (!acc[cat]) acc[cat] = []
		acc[cat].push(badge)
		return acc
	}, {})

	return Object.entries(grouped).sort((a, b) => {
		const orderA = CATEGORY_META[a[0]]?.order ?? 99
		const orderB = CATEGORY_META[b[0]]?.order ?? 99
		return orderA - orderB
	})
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

	const isVerified = user?.badges?.some((b) => b.id === "verified")

	usePageMeta({
		title: "Selos - uloggd",
		description: "Conheça todos os selos disponíveis no uloggd e o que cada um representa.",
	})

	useEffect(() => {
		async function fetchData() {
			const { data: { session } } = await supabase.auth.getSession()

			const [badgesRes, statusRes] = await Promise.all([
				fetch("/api/badges/list").then((r) => r.json()),
				session
					? fetch("/api/verification/status", {
							headers: { Authorization: `Bearer ${session.access_token}` },
						}).then((r) => r.json())
					: Promise.resolve({ request: null }),
			])

			setBadges(badgesRes.badges || [])
			setHasPendingRequest(statusRes.request?.status === "pending")
			setLoading(false)
		}
		fetchData()
	}, [user])

	async function handleSubmitRequest(reason) {
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) return

		setSubmitting(true)

		try {
			const res = await fetch("/api/verification/request", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ reason }),
			})

			const data = await res.json()

			if (!res.ok) {
				notify(data.error, "error")
				setSubmitting(false)
				return
			}

			setHasPendingRequest(true)
			setShowVerificationModal(false)
			setTimeout(() => setShowSuccessModal(true), 150)
		} catch (e) {
			console.error(e)
			notify("Erro ao enviar solicitação.", "error")
		}

		setSubmitting(false)
	}

	const groupedBadges = groupBadgesByCategory(badges)

	return (
		<div className="py-12">
			<div className="mb-10">
				<h1 className="text-2xl font-bold text-white mb-2">Selos</h1>
				<p className="text-sm text-zinc-500">
					Distintivos que representam funções, conquistas e reconhecimentos na plataforma.
				</p>
			</div>

			{user && (
				<VerificationBanner
					onClick={() => setShowVerificationModal(true)}
					isVerified={isVerified}
					hasPendingRequest={hasPendingRequest}
				/>
			)}

			{loading ? (
				<div className="flex items-center justify-center py-20">
					<Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
				</div>
			) : (
				<div>
					{groupedBadges.map(([categoryKey, categoryBadges]) => (
						<BadgeCategory
							key={categoryKey}
							categoryKey={categoryKey}
							badges={categoryBadges}
							onBadgeClick={setActiveBadge}
						/>
					))}
				</div>
			)}

			<BadgeModal
				badge={activeBadge}
				isOpen={!!activeBadge}
				onClose={() => setActiveBadge(null)}
			/>

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