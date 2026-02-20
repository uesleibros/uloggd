import { useState, useEffect, useCallback } from "react"
import { Star, X, Calendar, SlidersHorizontal, MessageSquare, Plus, Trash2, AlertTriangle, Check, Trophy, RotateCcw, Clock, User, Pencil } from "lucide-react"
import { useAuth } from "../../../hooks/useAuth"
import { supabase } from "../../../lib/supabase"
import { notify } from "../UI/Notification"
import { MarkdownEditor } from "../MarkdownEditor"
import { formatRating, toRatingValue, ratingSteps } from "../../../utils/rating"
import Modal from "../UI/Modal"

const STATUS_CONFIG = {
	played: { label: "Jogado", color: "bg-emerald-500", textColor: "text-emerald-400" },
	retired: { label: "Aposentado", color: "bg-blue-500", textColor: "text-blue-400" },
	shelved: { label: "Na prateleira", color: "bg-amber-500", textColor: "text-amber-400" },
	abandoned: { label: "Abandonado", color: "bg-red-500", textColor: "text-red-400" },
}

const RATING_MODES = [
	{ id: "stars_5", label: "★5" },
	{ id: "stars_5h", label: "★5½" },
	{ id: "points_10", label: "0–10" },
	{ id: "points_10d", label: "0–10.0" },
	{ id: "points_100", label: "0–100" },
]

const ASPECT_SUGGESTIONS = ["Gameplay", "História", "Personagens", "Trilha sonora", "Gráficos", "Level design", "Rejogabilidade", "Multiplayer", "Performance", "UI/UX"]
const MAX_ASPECTS = 10
const MAX_ASPECT_LABEL = 30
const MAX_ASPECT_REVIEW = 500

function HalfStar({ size = "w-10 h-10", filledColor = "text-amber-400", emptyColor = "text-zinc-700" }) {
	return (
		<div className={`relative ${size}`}>
			<Star className={`absolute inset-0 w-full h-full ${emptyColor} fill-current`} />
			<div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
				<Star className={`${size} ${filledColor} fill-current`} style={{ minWidth: "100%", width: "auto", minHeight: "100%" }} />
			</div>
		</div>
	)
}

function StarRatingInput({ value, onChange, allowHalf = true, size = "md" }) {
	const [hover, setHover] = useState(0)
	const active = hover || value || 0
	const sizeClass = size === "sm" ? "w-8 h-8 sm:w-7 sm:h-7" : "w-10 h-10"

	return (
		<div className="flex items-center gap-3">
			<div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
				{[1, 2, 3, 4, 5].map((star) => {
					const halfVal = star * 2 - 1
					const fullVal = star * 2

					if (!allowHalf) {
						return (
							<div key={star} className={`relative ${sizeClass}`}>
								<div className="absolute inset-0 z-10 cursor-pointer" onMouseEnter={() => setHover(fullVal)} onClick={() => onChange(fullVal === value ? 0 : fullVal)} />
								<Star className={`absolute inset-0 w-full h-full text-zinc-700 fill-current`} />
								{active >= fullVal && <Star className={`absolute inset-0 w-full h-full text-amber-400 fill-current`} />}
							</div>
						)
					}

					return (
						<div key={star} className={`relative ${sizeClass}`}>
							<div className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer" onMouseEnter={() => setHover(halfVal)} onClick={() => onChange(halfVal === value ? 0 : halfVal)} />
							<div className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer" onMouseEnter={() => setHover(fullVal)} onClick={() => onChange(fullVal === value ? 0 : fullVal)} />
							<Star className={`absolute inset-0 w-full h-full text-zinc-700 fill-current`} />
							{active >= halfVal && active < fullVal && (
								<div className="absolute inset-0">
									<Star
										className="w-full h-full text-amber-400 fill-current"
										style={{ clipPath: "inset(0 50% 0 0)" }}
									/>
								</div>
							)}
							{active >= fullVal && <Star className={`absolute inset-0 w-full h-full text-amber-400 fill-current`} />}
						</div>
					)
				})}
			</div>

			{value > 0 && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-zinc-400 tabular-nums">{allowHalf ? (value / 2).toFixed(1) : (value / 2).toFixed(0)}</span>
					<button type="button" onClick={() => onChange(0)} className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors p-2 -m-0.5">
						<X className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	)
}

function PointsRatingInput({ value, onChange, mode, compact = false }) {
	const config = ratingSteps(mode)
	const displayValue = value != null ? formatRating(value, mode)?.display ?? "" : ""

	function handleChange(e) {
		const raw = parseFloat(e.target.value)
		if (isNaN(raw)) { onChange(null); return }
		const clamped = Math.min(Math.max(raw, config.min), config.max)
		onChange(toRatingValue(clamped, mode))
	}

	return (
		<div className="flex items-center gap-2">
			<input
				type="number"
				inputMode={mode === "points_10d" ? "decimal" : "numeric"}
				value={displayValue}
				onChange={handleChange}
				min={config.min}
				max={config.max}
				step={config.step}
				placeholder="—"
				className={`bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
					compact ? "w-16 px-2 py-2 text-sm" : "w-20 px-3 py-2.5 text-sm"
				}`}
			/>
			<span className={compact ? "text-xs text-zinc-600" : "text-sm text-zinc-500"}>/ {config.max}</span>
			{value != null && value > 0 && (
				<button type="button" onClick={() => onChange(null)} className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors p-2 -m-0.5">
					<X className="w-4 h-4" />
				</button>
			)}
		</div>
	)
}

function RatingModeSelector({ mode, setMode, compact = false }) {
	const modes = compact ? RATING_MODES : [
		{ id: "stars_5", label: "5 Estrelas" },
		{ id: "stars_5h", label: "5 Estrelas (meia)" },
		{ id: "points_10", label: "0–10" },
		{ id: "points_10d", label: "0–10.0" },
		{ id: "points_100", label: "0–100" },
	]

	return (
		<div className="flex flex-wrap gap-1.5">
			{modes.map((m) => (
				<button
					key={m.id}
					type="button"
					onClick={() => setMode(m.id)}
					className={`rounded-lg font-medium cursor-pointer transition-all duration-200 ${
						compact ? "px-2.5 py-1.5 text-[11px]" : "px-2.5 py-1.5 text-xs"
					} ${
						mode === m.id
							? "bg-white text-black"
							: "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600"
					}`}
				>
					{m.label}
				</button>
			))}
		</div>
	)
}

function PlatformSelect({ platforms, value, onChange, placeholder = "Selecionar plataforma..." }) {
	if (!platforms || platforms.length === 0) return null
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer appearance-none"
			style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
		>
			<option value="">{placeholder}</option>
			{platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
		</select>
	)
}

function LogSection({ title, description, children }) {
	return (
		<div className="rounded-xl p-4 sm:p-5 bg-zinc-800/50 border border-zinc-700">
			<h3 className="text-sm font-semibold text-white mb-0.5">{title}</h3>
			{description && <p className="text-xs text-zinc-500 mb-3">{description}</p>}
			{!description && <div className="mb-3" />}
			{children}
		</div>
	)
}

function TabNav({ activeTab, setActiveTab }) {
	const tabs = [
		{ key: "review", label: "Review", icon: <Star className="w-4 h-4 fill-current" /> },
		{ key: "dates", label: "Datas", icon: <Calendar className="w-4 h-4" /> },
		{ key: "details", label: "Detalhes", icon: <SlidersHorizontal className="w-4 h-4" /> },
	]

	return (
		<div className="flex gap-1 pb-0.5">
			{tabs.map((tab) => (
				<button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap flex-1 sm:flex-initial ${activeTab === tab.key ? "bg-white text-black" : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"}`}>
					{tab.icon}
					{tab.label}
				</button>
			))}
		</div>
	)
}

function AspectRatingItem({ aspect, onUpdate, onRemove }) {
	const [expanded, setExpanded] = useState(false)
	const isStars = aspect.ratingMode === "stars_5" || aspect.ratingMode === "stars_5h"

	function handleStarChange(starVal) {
		if (starVal === 0) { onUpdate({ ...aspect, rating: null }); return }
		if (aspect.ratingMode === "stars_5") onUpdate({ ...aspect, rating: Math.ceil(starVal / 2) * 20 })
		else onUpdate({ ...aspect, rating: starVal * 10 })
	}

	function getStarValue() {
		if (aspect.rating == null) return 0
		if (aspect.ratingMode === "stars_5") return Math.round(aspect.rating / 20) * 2
		return Math.round(aspect.rating / 10)
	}

	function handleModeChange(newMode) {
		let converted = aspect.rating
		if (converted != null) {
			if (newMode === "stars_5") converted = Math.round(converted / 20) * 20
			else if (newMode === "stars_5h") converted = Math.round(converted / 10) * 10
			else if (newMode === "points_10") converted = Math.round(converted / 10) * 10
			else if (newMode === "points_10d") converted = Math.round(converted / 5) * 5
		}
		onUpdate({ ...aspect, ratingMode: newMode, rating: converted })
	}

	const hasReview = !!aspect.review?.trim()

	return (
		<div className="bg-zinc-900/50 border border-zinc-700/50 rounded-xl overflow-hidden">
			<div className="p-3 flex items-start gap-3">
				<div className="flex-1 min-w-0 space-y-2.5">
					<div className="flex items-center gap-2">
						<input type="text" value={aspect.label} onChange={(e) => onUpdate({ ...aspect, label: e.target.value.slice(0, MAX_ASPECT_LABEL) })} placeholder="Nome do aspecto" className="flex-1 min-w-0 px-0 py-0 bg-transparent text-sm font-medium text-white placeholder-zinc-600 focus:outline-none border-none" />
						<span className="text-[10px] text-zinc-700 flex-shrink-0">{aspect.label.length}/{MAX_ASPECT_LABEL}</span>
					</div>
					<RatingModeSelector mode={aspect.ratingMode} setMode={handleModeChange} compact />
					<div>
						{isStars ? (
							<StarRatingInput value={getStarValue()} onChange={handleStarChange} allowHalf={aspect.ratingMode === "stars_5h"} size="sm" />
						) : (
							<PointsRatingInput value={aspect.rating} onChange={(val) => onUpdate({ ...aspect, rating: val })} mode={aspect.ratingMode} compact />
						)}
					</div>
				</div>
				<div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
					<button type="button" onClick={() => setExpanded(!expanded)} className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${expanded || hasReview ? "text-indigo-400 bg-indigo-400/10" : "text-zinc-700 hover:text-zinc-400"}`}>
						<MessageSquare className="w-4 h-4" />
					</button>
					<button type="button" onClick={onRemove} className="p-2 text-zinc-700 hover:text-red-400 transition-colors cursor-pointer rounded-lg">
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
			{expanded && (
				<div className="px-3 pb-3 border-t border-zinc-800">
					<div className="pt-3">
						<MarkdownEditor value={aspect.review || ""} onChange={(val) => onUpdate({ ...aspect, review: val })} maxLength={MAX_ASPECT_REVIEW} placeholder={`Comentário sobre ${aspect.label || "este aspecto"}...`} />
					</div>
				</div>
			)}
		</div>
	)
}

function AspectRatings({ aspects, setAspects }) {
	const [showSuggestions, setShowSuggestions] = useState(false)
	const usedLabels = aspects.map(a => a.label.toLowerCase())
	const availableSuggestions = ASPECT_SUGGESTIONS.filter(s => !usedLabels.includes(s.toLowerCase()))

	function addAspect(label = "") {
		if (aspects.length >= MAX_ASPECTS) return
		setAspects([...aspects, { id: crypto.randomUUID(), label, rating: null, ratingMode: "stars_5h", review: "" }])
		setShowSuggestions(false)
	}

	return (
		<LogSection title="Avaliação por aspecto" description="Avalie partes específicas do jogo.">
			{aspects.length > 0 && (
				<div className="space-y-2 mb-3">
					{aspects.map((aspect) => (
						<AspectRatingItem key={aspect.id} aspect={aspect} onUpdate={(u) => setAspects(aspects.map(a => a.id === u.id ? u : a))} onRemove={() => setAspects(aspects.filter(a => a.id !== aspect.id))} />
					))}
				</div>
			)}
			{aspects.length < MAX_ASPECTS && (
				<div>
					<button type="button" onClick={() => setShowSuggestions(!showSuggestions)} className="w-full flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer">
						<Plus className="w-4 h-4" />
						Adicionar aspecto
						<span className="text-zinc-700 text-xs">{aspects.length}/{MAX_ASPECTS}</span>
					</button>
					{showSuggestions && (
						<div className="mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-lg">
							{availableSuggestions.length > 0 && (
								<>
									<p className="text-xs text-zinc-500 mb-2">Sugestões</p>
									<div className="flex flex-wrap gap-1.5 mb-3">
										{availableSuggestions.map((s) => (
											<button key={s} type="button" onClick={() => addAspect(s)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-full text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer">{s}</button>
										))}
									</div>
								</>
							)}
							<div className="flex gap-2">
								<button type="button" onClick={() => addAspect("")} className="flex-1 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer text-center">Campo vazio</button>
								<button type="button" onClick={() => setShowSuggestions(false)} className="px-3 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">Fechar</button>
							</div>
						</div>
					)}
				</div>
			)}
		</LogSection>
	)
}

function ReviewTabContent({ rating, setRating, ratingMode, setRatingMode, platform, setPlatform, platforms, review, setReview, spoilers, setSpoilers, mastered, setMastered, aspects, setAspects }) {
	const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

	function handleStarChange(starVal) {
		if (starVal === 0) { setRating(null); return }
		if (ratingMode === "stars_5") setRating(Math.ceil(starVal / 2) * 20)
		else setRating(starVal * 10)
	}

	function getStarValue() {
		if (rating == null) return 0
		if (ratingMode === "stars_5") return Math.round(rating / 20) * 2
		return Math.round(rating / 10)
	}

	function handleModeChange(newMode) {
		if (rating != null) {
			if (newMode === "stars_5") setRating(Math.round(rating / 20) * 20)
			else if (newMode === "stars_5h") setRating(Math.round(rating / 10) * 10)
			else if (newMode === "points_10") setRating(Math.round(rating / 10) * 10)
			else if (newMode === "points_10d") setRating(Math.round(rating / 5) * 5)
		}
		setRatingMode(newMode)
	}

	return (
		<div className="space-y-4">
			<LogSection title="Nota geral" description="Escolha o formato e dê sua nota.">
				<div className="flex items-center justify-between mb-3 gap-2">
					<RatingModeSelector mode={ratingMode} setMode={handleModeChange} />
					<button type="button" onClick={() => setMastered(!mastered)} className={`cursor-pointer p-2.5 rounded-lg transition-all duration-200 flex-shrink-0 ${mastered ? "text-amber-400 bg-amber-400/10 border border-amber-400/20" : "text-zinc-600 hover:text-zinc-400 border border-transparent"}`} title="Masterizado">
						<Trophy className="w-5 h-5 fill-current" />
					</button>
				</div>
				{isStars ? (
					<StarRatingInput value={getStarValue()} onChange={handleStarChange} allowHalf={ratingMode === "stars_5h"} />
				) : (
					<PointsRatingInput value={rating} onChange={setRating} mode={ratingMode} />
				)}
			</LogSection>

			<AspectRatings aspects={aspects} setAspects={setAspects} />

			<LogSection title="Plataforma" description="Em qual plataforma você jogou?">
				<PlatformSelect platforms={platforms} value={platform} onChange={setPlatform} />
			</LogSection>

			<LogSection title="Review" description="Escreva sobre sua experiência. Suporta Markdown.">
				<MarkdownEditor value={review} onChange={setReview} maxLength={10000} placeholder="O que achou do jogo?" />
				<label htmlFor="spoilers-check" className="flex items-center mt-3 cursor-pointer select-none py-1">
					<input type="checkbox" id="spoilers-check" checked={spoilers} onChange={(e) => setSpoilers(e.target.checked)} className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-white cursor-pointer" />
					<span className="text-sm text-zinc-500 ml-2">Contém spoilers</span>
				</label>
			</LogSection>
		</div>
	)
}

function DatesTabContent({ startedOn, setStartedOn, finishedOn, setFinishedOn }) {
	const today = new Date().toISOString().split("T")[0]
	const minDate = "2000-01-01"
	const startError = startedOn && (startedOn < minDate || startedOn > today) ? (startedOn > today ? "Data no futuro" : "Data muito antiga") : null
	const finishError = finishedOn && (finishedOn < minDate || finishedOn > today) ? (finishedOn > today ? "Data no futuro" : "Data muito antiga") : null
	const orderError = startedOn && finishedOn && finishedOn < startedOn ? "Término antes do início" : null

	return (
		<LogSection title="Período" description="Quando você começou e terminou de jogar?">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label className="text-sm text-zinc-400 mb-1.5 block">Começou em</label>
					<input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} max={today} min={minDate} className={`w-full px-3 py-2.5 bg-zinc-900/50 border rounded-lg text-sm text-white focus:outline-none transition-colors cursor-pointer [color-scheme:dark] ${startError ? "border-red-500/50" : "border-zinc-700/50 focus:border-zinc-500"}`} />
					{startError && <p className="text-xs text-red-400 mt-1">{startError}</p>}
				</div>
				<div>
					<label className="text-sm text-zinc-400 mb-1.5 block">Terminou em</label>
					<input type="date" value={finishedOn} onChange={(e) => setFinishedOn(e.target.value)} max={today} min={startedOn || minDate} className={`w-full px-3 py-2.5 bg-zinc-900/50 border rounded-lg text-sm text-white focus:outline-none transition-colors cursor-pointer [color-scheme:dark] ${finishError || orderError ? "border-red-500/50" : "border-zinc-700/50 focus:border-zinc-500"}`} />
					{finishError && <p className="text-xs text-red-400 mt-1">{finishError}</p>}
					{!finishError && orderError && <p className="text-xs text-red-400 mt-1">{orderError}</p>}
				</div>
			</div>
		</LogSection>
	)
}

function DetailsTabContent({ logTitle, setLogTitle, replay, setReplay, hoursPlayed, setHoursPlayed, minutesPlayed, setMinutesPlayed, playedPlatform, setPlayedPlatform, platforms, onDelete, deleting, isEditing }) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	return (
		<div className="space-y-4">
			<LogSection title="Informações do log">
				<div className="flex gap-3 sm:gap-4">
					<div className="flex-1 min-w-0">
						<label className="text-sm text-zinc-400 mb-1.5 block">Título do log</label>
						<input type="text" value={logTitle} onChange={(e) => setLogTitle(e.target.value)} placeholder="Nomeie seu log" maxLength={24} className="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" />
						<p className="text-xs text-zinc-600 mt-1">Máximo de 24 caracteres</p>
					</div>
					<div className="flex-shrink-0">
						<label className="text-sm text-zinc-400 mb-1.5 block">Replay</label>
						<button type="button" onClick={() => setReplay(!replay)} className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${replay ? "bg-white text-black" : "bg-zinc-900/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300"}`}>
							<RotateCcw className="w-5 h-5" />
						</button>
					</div>
				</div>
			</LogSection>

			<LogSection title="Tempo jogado" description="Quanto tempo você passou jogando?">
				<div className="flex gap-3">
					<div className="flex items-center gap-1.5">
						<input type="number" inputMode="numeric" value={hoursPlayed} onChange={(e) => { const v = e.target.value; if (v === "") { setHoursPlayed(""); return }; const n = parseInt(v); if (!isNaN(n) && n >= 0 && n <= 99999) setHoursPlayed(n.toString()) }} min="0" max="99999" placeholder="0" className="w-16 px-2 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
						<span className="text-sm text-zinc-500">h</span>
					</div>
					<div className="flex items-center gap-1.5">
						<input type="number" inputMode="numeric" value={minutesPlayed} onChange={(e) => { const v = e.target.value; if (v === "") { setMinutesPlayed(""); return }; const n = parseInt(v); if (!isNaN(n) && n >= 0 && n <= 59) setMinutesPlayed(n.toString()) }} min="0" max="59" placeholder="0" className="w-16 px-2 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
						<span className="text-sm text-zinc-500">m</span>
					</div>
				</div>
			</LogSection>

			<LogSection title="Jogou em" description="A plataforma física que você usou.">
				<PlatformSelect platforms={platforms} value={playedPlatform} onChange={setPlayedPlatform} />
			</LogSection>

			{isEditing && (
				<div className="rounded-xl p-4 sm:p-5 bg-red-500/5 border border-red-500/20">
					<h3 className="text-sm font-semibold text-red-400 mb-1">Zona de perigo</h3>
					<p className="text-xs text-zinc-500 mb-3">Essa ação é irreversível.</p>
					{!showDeleteConfirm ? (
						<button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2">
							<Trash2 className="w-4 h-4" />
							Excluir este log
						</button>
					) : (
						<div className="p-3 sm:p-4 bg-zinc-900/30 border border-red-500/20 rounded-lg space-y-4">
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
									<AlertTriangle className="w-5 h-5 text-red-400" />
								</div>
								<div>
									<p className="text-sm font-semibold text-red-400">Tem certeza?</p>
									<p className="text-xs text-zinc-500 mt-1 leading-relaxed">Todos os dados deste log serão permanentemente excluídos.</p>
								</div>
							</div>
							<div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
								<button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer">Cancelar</button>
								<button type="button" onClick={onDelete} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
									{deleting ? <div className="w-4 h-4 border-2 border-red-300 border-t-white rounded-full animate-spin" /> : "Excluir permanentemente"}
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

function LogModalContent({ game, onClose, existingLog, onDeleted }) {
	const isEditing = !!existingLog
	const [activeTab, setActiveTab] = useState("review")
	const [submitting, setSubmitting] = useState(false)
	const [deleting, setDeleting] = useState(false)

	const [rating, setRating] = useState(existingLog?.rating ?? null)
	const [ratingMode, setRatingMode] = useState(existingLog?.rating_mode || "stars_5h")
	const [platform, setPlatform] = useState(existingLog?.platform_id?.toString() || "")
	const [review, setReview] = useState(existingLog?.review || "")
	const [spoilers, setSpoilers] = useState(existingLog?.contain_spoilers || false)
	const [mastered, setMastered] = useState(existingLog?.mastered || false)
	const [startedOn, setStartedOn] = useState(existingLog?.started_on || "")
	const [finishedOn, setFinishedOn] = useState(existingLog?.finished_on || "")
	const [logTitle, setLogTitle] = useState(existingLog?.log_title || "Log")
	const [replay, setReplay] = useState(existingLog?.replay || false)
	const [hoursPlayed, setHoursPlayed] = useState(existingLog?.hours_played?.toString() || "")
	const [minutesPlayed, setMinutesPlayed] = useState(existingLog?.minutes_played?.toString() || "")
	const [playedPlatform, setPlayedPlatform] = useState(existingLog?.played_platform_id?.toString() || "")
	const [aspects, setAspects] = useState(
		existingLog?.aspect_ratings?.map(a => ({ id: crypto.randomUUID(), label: a.label || "", rating: a.rating ?? null, ratingMode: a.ratingMode || "stars_5h", review: a.review || "" })) || []
	)

	async function getToken() {
		const { data: { session } } = await supabase.auth.getSession()
		return session?.access_token
	}

	async function handleSave() {
		const today = new Date().toISOString().split("T")[0]
		const minDate = "2000-01-01"

		if (startedOn && (startedOn < minDate || startedOn > today)) { notify("Data de início inválida.", "error"); return }
		if (finishedOn && (finishedOn < minDate || finishedOn > today)) { notify("Data de término inválida.", "error"); return }
		if (startedOn && finishedOn && finishedOn < startedOn) { notify("Data de término não pode ser antes do início.", "error"); return }

		const validAspects = aspects
			.filter(a => a.label.trim())
			.map(a => ({
				label: a.label.trim().slice(0, MAX_ASPECT_LABEL),
				rating: a.rating,
				ratingMode: a.ratingMode,
				review: a.review?.trim().slice(0, MAX_ASPECT_REVIEW) || null,
			}))

		setSubmitting(true)
		try {
			const token = await getToken()
			if (!token) { notify("Você precisa estar logado.", "error"); return }

			const payload = {
				gameId: game.id,
				gameSlug: game.slug,
				logTitle: logTitle || "Log",
				rating: rating ?? null,
				ratingMode,
				review: review.trim() || null,
				containSpoilers: spoilers,
				mastered,
				startedOn: startedOn || null,
				finishedOn: finishedOn || null,
				replay,
				hoursPlayed: hoursPlayed ? parseInt(hoursPlayed) : null,
				minutesPlayed: minutesPlayed ? parseInt(minutesPlayed) : null,
				platformId: platform ? parseInt(platform) : null,
				playedPlatformId: playedPlatform ? parseInt(playedPlatform) : null,
				aspectRatings: validAspects.length > 0 ? validAspects : null,
			}

			const url = isEditing ? "/api/logs?action=update" : "/api/logs?action=create"
			if (isEditing) payload.logId = existingLog.id

			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
				body: JSON.stringify(payload),
			})

			if (res.ok) { notify(isEditing ? "Log atualizado!" : "Log criado!"); onClose() }
			else { const err = await res.json().catch(() => ({})); notify(err.error || "Falha ao salvar.", "error") }
		} catch { notify("Falha ao salvar.", "error") }
		finally { setSubmitting(false) }
	}

	async function handleDelete() {
		if (!isEditing) return
		setDeleting(true)
		try {
			const token = await getToken()
			if (!token) return
			const res = await fetch("/api/logs?action=delete", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify({ logId: existingLog.id }) })
			if (res.ok) { notify("Log excluído!"); onDeleted?.(); onClose() }
			else notify("Falha ao excluir.", "error")
		} catch { notify("Falha ao excluir.", "error") }
		finally { setDeleting(false) }
	}

	const releaseYear = game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null

	return (
		<div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden">
			<div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-700 flex-shrink-0 md:px-5 md:pb-3" style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}>
				<div className="flex items-center gap-3 min-w-0">
					{game.cover && <img src={`https:${game.cover.url}`} alt="" className="w-8 h-11 rounded object-cover bg-zinc-800 flex-shrink-0" draggable={false} />}
					<div className="min-w-0">
						<h2 className="text-base md:text-lg font-semibold text-white truncate">{game.name}</h2>
						{releaseYear && <p className="text-xs text-zinc-500">{releaseYear}</p>}
					</div>
				</div>
				<div className="flex flex-col items-center flex-shrink-0">
					<button onClick={onClose} className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:bg-zinc-800 transition-all">
						<X className="w-4 h-4" />
					</button>
					<span className="text-[10px] font-bold text-zinc-600 mt-1 uppercase tracking-wide hidden md:block">ESC</span>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 py-4">
				<div className="mb-4"><TabNav activeTab={activeTab} setActiveTab={setActiveTab} /></div>
				{activeTab === "review" && <ReviewTabContent rating={rating} setRating={setRating} ratingMode={ratingMode} setRatingMode={setRatingMode} platform={platform} setPlatform={setPlatform} platforms={game.platforms} review={review} setReview={setReview} spoilers={spoilers} setSpoilers={setSpoilers} mastered={mastered} setMastered={setMastered} aspects={aspects} setAspects={setAspects} />}
				{activeTab === "dates" && <DatesTabContent startedOn={startedOn} setStartedOn={setStartedOn} finishedOn={finishedOn} setFinishedOn={setFinishedOn} />}
				{activeTab === "details" && <DetailsTabContent logTitle={logTitle} setLogTitle={setLogTitle} replay={replay} setReplay={setReplay} hoursPlayed={hoursPlayed} setHoursPlayed={setHoursPlayed} minutesPlayed={minutesPlayed} setMinutesPlayed={setMinutesPlayed} playedPlatform={playedPlatform} setPlayedPlatform={setPlayedPlatform} platforms={game.platforms} onDelete={handleDelete} deleting={deleting} isEditing={isEditing} />}
			</div>

			<div className="flex items-center justify-end gap-2 sm:gap-3 px-4 md:px-5 py-3 border-t border-zinc-700 flex-shrink-0" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}>
				<button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all duration-200 cursor-pointer active:bg-zinc-600">Cancelar</button>
				<button type="button" onClick={handleSave} disabled={submitting} className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${submitting ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50" : "bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white cursor-pointer shadow-lg shadow-indigo-500/20"}`}>
					{submitting ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
					{isEditing ? "Salvar" : "Criar Log"}
				</button>
			</div>
		</div>
	)
}

function UserLogRating({ rating, ratingMode }) {
	if (rating == null) return null
	const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

	if (!isStars) {
		const formatted = formatRating(rating, ratingMode)
		if (!formatted) return null
		return (
			<div className="flex items-baseline gap-1">
				<span className="text-3xl font-bold text-white tabular-nums">{formatted.display}</span>
				<span className="text-lg text-zinc-500 font-normal">/{formatted.max}</span>
			</div>
		)
	}

	const raw = rating / 20
	const count = ratingMode === "stars_5" ? Math.round(raw) : Math.round(raw * 2) / 2
	const clamped = Math.min(Math.max(count, 0), 5)
	const full = Math.floor(clamped)
	const half = clamped % 1 >= 0.5
	const empty = 5 - full - (half ? 1 : 0)

	return (
		<div className="flex items-center gap-1">
			{Array.from({ length: full }, (_, i) => <Star key={`f${i}`} className="w-7 h-7 text-amber-400 fill-current" />)}
			{half && <HalfStar size="w-7 h-7" />}
			{Array.from({ length: empty }, (_, i) => <Star key={`e${i}`} className="w-7 h-7 text-zinc-700 fill-current" />)}
		</div>
	)
}

function UserLogStatusBadge({ status }) {
	const config = STATUS_CONFIG[status]
	if (!config) return null
	return (
		<div className="flex items-center gap-2">
			<div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
			<span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
		</div>
	)
}

function AspectRatingDisplay({ aspect }) {
	const mode = aspect.ratingMode || "stars_5h"
	const isStars = mode === "stars_5" || mode === "stars_5h"
	if (aspect.rating == null) return <span className="text-xs text-zinc-700">—</span>

	if (isStars) {
		const raw = aspect.rating / 20
		const count = mode === "stars_5" ? Math.round(raw) : Math.round(raw * 2) / 2
		const clamped = Math.min(Math.max(count, 0), 5)
		const full = Math.floor(clamped)
		const half = clamped % 1 >= 0.5
		const empty = 5 - full - (half ? 1 : 0)
		return (
			<div className="flex items-center gap-0.5">
				{Array.from({ length: full }, (_, i) => <Star key={`f${i}`} className="w-3.5 h-3.5 text-amber-400 fill-current" />)}
				{half && <HalfStar size="w-3.5 h-3.5" />}
				{Array.from({ length: empty }, (_, i) => <Star key={`e${i}`} className="w-3.5 h-3.5 text-zinc-700 fill-current" />)}
			</div>
		)
	}

	const formatted = formatRating(aspect.rating, mode)
	if (!formatted) return null
	return <span className="text-xs font-semibold text-zinc-300 tabular-nums">{formatted.display}<span className="text-zinc-600">/{formatted.max}</span></span>
}

export function UserLogCard({ log, onEdit }) {
	if (!log) return null

	const playtime = []
	if (log.hours_played) playtime.push(`${log.hours_played}h`)
	if (log.minutes_played) playtime.push(`${log.minutes_played}m`)
	const aspects = log.aspect_ratings || []

	return (
		<div className="rounded-xl bg-zinc-800/60 border border-zinc-700 overflow-hidden">
			<div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between border-b border-zinc-700/50">
				<div className="flex items-center gap-2.5">
					<User className="w-4 h-4 text-indigo-400" />
					<span className="text-sm font-semibold text-white">{log.log_title || "Log"}</span>
				</div>
				<button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white active:text-white bg-zinc-700/50 hover:bg-zinc-700 active:bg-zinc-600 rounded-lg transition-all duration-200 cursor-pointer border border-zinc-600/50 hover:border-zinc-500">
					<Pencil className="w-3.5 h-3.5" />
					Editar
				</button>
			</div>

			<div className="p-4 sm:p-5">
				<div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
					<div className="flex-shrink-0">
						{log.rating != null ? <UserLogRating rating={log.rating} ratingMode={log.rating_mode} /> : <span className="text-sm text-zinc-600 italic">Sem nota</span>}
					</div>

					<div className="flex-1 min-w-0 space-y-3">
						<div className="flex flex-wrap items-center gap-3">
							{log.mastered && <div className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-400 fill-current" /><span className="text-xs text-amber-400 font-medium">Masterizado</span></div>}
							{log.replay && <div className="flex items-center gap-1.5"><RotateCcw className="w-4 h-4 text-zinc-400" /><span className="text-xs text-zinc-400 font-medium">Replay</span></div>}
						</div>

						{aspects.length > 0 && (
							<div className="space-y-1.5 pt-1">
								{aspects.map((aspect, i) => (
									<div key={i} className="flex items-center justify-between gap-3">
										<span className="text-xs text-zinc-500 truncate">{aspect.label}</span>
										<AspectRatingDisplay aspect={aspect} />
									</div>
								))}
							</div>
						)}

						<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
							{playtime.length > 0 && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{playtime.join(" ")}</div>}
							{log.started_on && <span>Início: {new Date(log.started_on).toLocaleDateString("pt-BR")}</span>}
							{log.finished_on && <span>Fim: {new Date(log.finished_on).toLocaleDateString("pt-BR")}</span>}
						</div>

						{log.review && (
							<div className="mt-2 pt-3 border-t border-zinc-700/50">
								<p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{log.review}</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

function LogSelector({ logs, selectedId, onSelect, onNew }) {
	if (logs.length === 0) return null
	return (
		<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
			{logs.map((log) => (
				<button key={log.id} type="button" onClick={() => onSelect(log)} className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${selectedId === log.id ? "bg-white text-black" : "bg-zinc-800/50 text-zinc-500 hover:text-white border border-zinc-700 hover:border-zinc-600"}`}>
					{log.log_title || "Log"}
				</button>
			))}
			<button type="button" onClick={onNew} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-white border border-dashed border-zinc-700 hover:border-zinc-500 cursor-pointer transition-all duration-200">
				<Plus className="w-3 h-3" />
				Novo
			</button>
		</div>
	)
}

export default function ReviewButton({ game }) {
	const { user } = useAuth()
	const [showModal, setShowModal] = useState(false)
	const [logs, setLogs] = useState([])
	const [loading, setLoading] = useState(false)
	const [selectedLog, setSelectedLog] = useState(null)

	const fetchLogs = useCallback(async () => {
		if (!user || !game?.id) return
		setLoading(true)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return
			const res = await fetch("/api/logs?action=game", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` }, body: JSON.stringify({ gameId: game.id }) })
			if (res.ok) { const data = await res.json(); setLogs(data); if (data.length > 0 && !selectedLog) setSelectedLog(data[0]) }
		} catch {} finally { setLoading(false) }
	}, [user, game?.id])

	useEffect(() => { fetchLogs() }, [fetchLogs])

	if (!user) return null

	const hasLogs = logs.length > 0
	const activeLog = selectedLog || logs[0] || null

	function openModal(log = activeLog) { setSelectedLog(log); setShowModal(true) }
	function openNewLog() { setSelectedLog(null); setShowModal(true) }

	function handleClose() {
		setShowModal(false)
		fetchLogs()
	}

	function handleDeleted() {
		setSelectedLog(null)
		fetchLogs()
	}

	return (
		<>
			{hasLogs ? (
				<div className="space-y-3">
					{logs.length > 1 && <LogSelector logs={logs} selectedId={activeLog?.id} onSelect={(log) => setSelectedLog(log)} onNew={openNewLog} />}
					<UserLogCard log={activeLog} onEdit={() => openModal(activeLog)} />
					{logs.length === 1 && (
						<button type="button" onClick={openNewLog} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl text-sm text-zinc-500 hover:text-zinc-300 transition-all duration-200 cursor-pointer">
							<Plus className="w-4 h-4" />
							Criar outro log
						</button>
					)}
				</div>
			) : (
				<button onClick={() => openModal(null)} disabled={loading} className="inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
					{loading ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" /> : <Plus className="w-5 h-5" />}
					Criar Log
				</button>
			)}

			<Modal
				isOpen={showModal}
				onClose={handleClose}
				raw
				fullscreenMobile
				className="w-full md:max-w-2xl"
			>
				{showModal && (
					<LogModalContent
						game={game}
						existingLog={selectedLog}
						onClose={handleClose}
						onDeleted={handleDeleted}
					/>
				)}
			</Modal>
		</>
	)

}
