import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useAuth } from "../../../hooks/useAuth"
import { supabase } from "../../../lib/supabase"
import { notify } from "../UI/Notification"
import { MarkdownEditor } from "../MarkdownEditor"
import { formatRating, toRatingValue, ratingSteps } from "../../../utils/rating"

function StarRatingInput({ value, onChange, allowHalf = true }) {
  const [hover, setHover] = useState(0)
  const active = hover || value || 0

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => {
          const halfVal = star * 2 - 1
          const fullVal = star * 2

          if (!allowHalf) {
            return (
              <div key={star} className="relative w-9 h-9 sm:w-10 sm:h-10">
                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onMouseEnter={() => setHover(fullVal)}
                  onClick={() => onChange(fullVal === value ? 0 : fullVal)}
                />
                <svg className="absolute inset-0 w-full h-full text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {active >= fullVal && (
                  <svg className="absolute inset-0 w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                )}
              </div>
            )
          }

          return (
            <div key={star} className="relative w-9 h-9 sm:w-10 sm:h-10">
              <div
                className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
                onMouseEnter={() => setHover(halfVal)}
                onClick={() => onChange(halfVal === value ? 0 : halfVal)}
              />
              <div
                className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
                onMouseEnter={() => setHover(fullVal)}
                onClick={() => onChange(fullVal === value ? 0 : fullVal)}
              />
              <svg className="absolute inset-0 w-full h-full text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {active >= halfVal && active < fullVal && (
                <svg className="absolute inset-0 w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24" style={{ clipPath: "inset(0 50% 0 0)" }}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
              {active >= fullVal && (
                <svg className="absolute inset-0 w-full h-full text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {value > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 tabular-nums">
            {allowHalf ? (value / 2).toFixed(1) : (value / 2).toFixed(0)}
          </span>
          <button
            type="button"
            onClick={() => onChange(0)}
            className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors p-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function PointsRatingInput({ value, onChange, mode }) {
  const config = ratingSteps(mode)
  const displayValue = value != null ? formatRating(value, mode)?.display ?? "" : ""

  function handleChange(e) {
    const raw = parseFloat(e.target.value)
    if (isNaN(raw)) { onChange(null); return }
    const clamped = Math.min(Math.max(raw, config.min), config.max)
    onChange(toRatingValue(clamped, mode))
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={displayValue}
        onChange={handleChange}
        min={config.min}
        max={config.max}
        step={config.step}
        placeholder="—"
        className="w-20 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="text-sm text-zinc-500">/ {config.max}</span>
      {value != null && value > 0 && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="cursor-pointer text-zinc-600 hover:text-zinc-400 transition-colors p-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

function RatingModeSelector({ mode, setMode }) {
  const modes = [
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
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
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

function StatusSelector({ status, setStatus }) {
  const [open, setOpen] = useState(false)

  const statuses = [
    { id: "played", label: "Jogado", sub: "Nada específico" },
    { id: "completed", label: "Completo", sub: "Zerou o objetivo principal" },
    { id: "retired", label: "Aposentado", sub: "Terminou um jogo sem final" },
    { id: "shelved", label: "Na prateleira", sub: "Não terminou mas pode voltar" },
    { id: "abandoned", label: "Abandonado", sub: "Não terminou e não vai voltar" },
  ]

  const colors = {
    played: "bg-zinc-500",
    completed: "bg-emerald-500",
    retired: "bg-blue-500",
    shelved: "bg-amber-500",
    abandoned: "bg-red-500",
  }

  const current = statuses.find((s) => s.id === status)

  return (
    <div className="relative">
      <div className="flex rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`flex items-center justify-center w-9 border-r border-black/20 cursor-pointer transition-colors ${
            status ? colors[status] : "bg-zinc-700"
          }`}
        >
          <svg className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setStatus(status ? "" : "played")}
          className={`flex-1 flex items-center gap-2 px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
            status
              ? `${colors[status]} text-white`
              : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          }`}
        >
          {current?.label || "Jogado"}
        </button>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[10001]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-700">
              <h4 className="text-sm font-semibold text-white">Definir status</h4>
              <p className="text-xs text-zinc-500 mt-0.5">Como você finalizou esse jogo?</p>
            </div>
            <div className="p-2">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setStatus(s.id); setOpen(false) }}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg text-left cursor-pointer transition-all duration-200 ${
                    status === s.id ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0 ${colors[s.id]} ${status === s.id ? "ring-2 ring-offset-1 ring-offset-zinc-900 ring-white/20" : ""}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{s.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.sub}</p>
                  </div>
                  {status === s.id && (
                    <svg className="w-4 h-4 text-white ml-auto mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 ${
        active
          ? "bg-white text-black"
          : "bg-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-700/60 border border-zinc-700"
      }`}
    >
      {children}
    </button>
  )
}

function TabNav({ activeTab, setActiveTab }) {
  const tabs = [
    { key: "review", label: "Review", icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg> },
    { key: "dates", label: "Datas", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg> },
    { key: "details", label: "Detalhes", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg> },
  ]

  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActiveTab(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
            activeTab === tab.key
              ? "bg-white text-black"
              : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

function PlatformSelect({ platforms, value, onChange, label, placeholder = "Selecionar plataforma..." }) {
  if (!platforms || platforms.length === 0) return null

  return (
    <div>
      <label className="text-sm font-semibold text-white mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        <option value="">{placeholder}</option>
        {platforms.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
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

function ReviewTabContent({ rating, setRating, ratingMode, setRatingMode, platform, setPlatform, platforms, review, setReview, spoilers, setSpoilers, mastered, setMastered }) {
  const isStars = ratingMode === "stars_5" || ratingMode === "stars_5h"

  function handleStarChange(starVal) {
    if (starVal === 0) { setRating(null); return }
    if (ratingMode === "stars_5") {
      setRating(Math.ceil(starVal / 2) * 20)
    } else {
      setRating(starVal * 10)
    }
  }

  function getStarValue() {
    if (rating == null) return 0
    if (ratingMode === "stars_5") {
      return Math.round(rating / 20) * 2
    }
    return Math.round(rating / 10)
  }

  function handleModeChange(newMode) {
    if (rating != null) {
      const newIsStars = newMode === "stars_5" || newMode === "stars_5h"

      if (newMode === "stars_5") {
        setRating(Math.round(rating / 20) * 20)
      } else if (newMode === "stars_5h") {
        setRating(Math.round(rating / 10) * 10)
      } else if (newMode === "points_10") {
        setRating(Math.round(rating / 10) * 10)
      } else if (newMode === "points_10d") {
        setRating(Math.round(rating / 5) * 5)
      }
    }
    setRatingMode(newMode)
  }

  return (
    <div className="space-y-4">
      <LogSection title="Nota" description="Escolha o formato e dê sua nota.">
        <div className="flex items-center justify-between mb-3">
          <RatingModeSelector mode={ratingMode} setMode={handleModeChange} />
          <button
            type="button"
            onClick={() => setMastered(!mastered)}
            className={`cursor-pointer p-2 rounded-lg transition-all duration-200 flex-shrink-0 ml-2 ${
              mastered
                ? "text-amber-400 bg-amber-400/10 border border-amber-400/20"
                : "text-zinc-600 hover:text-zinc-400 border border-transparent"
            }`}
            title="Masterizado"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5m14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
            </svg>
          </button>
        </div>
        {isStars ? (
          <StarRatingInput
            value={getStarValue()}
            onChange={handleStarChange}
            allowHalf={ratingMode === "stars_5h"}
          />
        ) : (
          <PointsRatingInput value={rating} onChange={setRating} mode={ratingMode} />
        )}
      </LogSection>

      <LogSection title="Plataforma" description="Em qual plataforma você jogou?">
        <PlatformSelect
          platforms={platforms}
          value={platform}
          onChange={setPlatform}
          label=""
          placeholder="Selecionar plataforma..."
        />
      </LogSection>

      <LogSection title="Review" description="Escreva sobre sua experiência. Suporta Markdown.">
        <MarkdownEditor
          value={review}
          onChange={setReview}
          maxLength={10000}
          placeholder="O que achou do jogo?"
        />
        <div className="flex items-center mt-3">
          <input
            type="checkbox"
            id="spoilers-check"
            checked={spoilers}
            onChange={(e) => setSpoilers(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-white cursor-pointer"
          />
          <label htmlFor="spoilers-check" className="text-sm text-zinc-500 ml-2 cursor-pointer select-none">
            Contém spoilers
          </label>
        </div>
      </LogSection>
    </div>
  )
}

function DatesTabContent({ startedOn, setStartedOn, finishedOn, setFinishedOn }) {
  return (
    <LogSection title="Período" description="Quando você começou e terminou de jogar?">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">Começou em</label>
          <input
            type="date"
            value={startedOn}
            onChange={(e) => setStartedOn(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer [color-scheme:dark]"
          />
        </div>
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">Terminou em</label>
          <input
            type="date"
            value={finishedOn}
            onChange={(e) => setFinishedOn(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer [color-scheme:dark]"
          />
        </div>
      </div>
    </LogSection>
  )
}

function DetailsTabContent({ logTitle, setLogTitle, replay, setReplay, hoursPlayed, setHoursPlayed, minutesPlayed, setMinutesPlayed, playedPlatform, setPlayedPlatform, platforms, onDelete, deleting, isEditing }) {
  return (
    <div className="space-y-4">
      <LogSection title="Informações do log">
        <div className="flex gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <label className="text-sm text-zinc-400 mb-1.5 block">Título do log</label>
            <input
              type="text"
              value={logTitle}
              onChange={(e) => setLogTitle(e.target.value)}
              placeholder="Nomeie seu log"
              maxLength={24}
              className="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <p className="text-xs text-zinc-600 mt-1">Máximo de 24 caracteres</p>
          </div>
          <div className="flex-shrink-0">
            <label className="text-sm text-zinc-400 mb-1.5 block">Replay</label>
            <button
              type="button"
              onClick={() => setReplay(!replay)}
              className={`w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${
                replay
                  ? "bg-white text-black"
                  : "bg-zinc-900/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
          </div>
        </div>
      </LogSection>

      <LogSection title="Tempo jogado" description="Quanto tempo você passou jogando?">
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={hoursPlayed}
              onChange={(e) => setHoursPlayed(e.target.value)}
              min="0"
              placeholder="0"
              className="w-16 px-2 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-zinc-500">h</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              value={minutesPlayed}
              onChange={(e) => setMinutesPlayed(e.target.value)}
              min="0"
              max="59"
              placeholder="0"
              className="w-16 px-2 py-2.5 bg-zinc-900/50 border border-zinc-700/50 rounded-lg text-sm text-white text-center focus:outline-none focus:border-zinc-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-zinc-500">m</span>
          </div>
        </div>
      </LogSection>

      <LogSection title="Jogou em" description="A plataforma física que você usou.">
        <PlatformSelect
          platforms={platforms}
          value={playedPlatform}
          onChange={setPlayedPlatform}
          label=""
          placeholder="Selecionar plataforma..."
        />
      </LogSection>

      {isEditing && (
        <div className="rounded-xl p-4 sm:p-5 bg-red-500/5 border border-red-500/20">
          <h3 className="text-sm font-semibold text-red-400 mb-1">Zona de perigo</h3>
          <p className="text-xs text-zinc-500 mb-3">Essa ação é irreversível.</p>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:text-white bg-red-500/5 hover:bg-red-500 border border-red-500/20 hover:border-red-500 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? (
              <div className="w-4 h-4 border-2 border-red-300 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            )}
            Excluir este log
          </button>
        </div>
      )}
    </div>
  )
}

function LogModal({ game, onClose, existingLog, onDeleted }) {
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

  const [status, setStatus] = useState(existingLog?.status || "")
  const [playing, setPlaying] = useState(existingLog?.playing || false)
  const [backlog, setBacklog] = useState(existingLog?.backlog || false)
  const [wishlist, setWishlist] = useState(existingLog?.wishlist || false)
  const [liked, setLiked] = useState(existingLog?.liked || false)

  const [startedOn, setStartedOn] = useState(existingLog?.started_on || "")
  const [finishedOn, setFinishedOn] = useState(existingLog?.finished_on || "")

  const [logTitle, setLogTitle] = useState(existingLog?.log_title || "Log")
  const [replay, setReplay] = useState(existingLog?.replay || false)
  const [hoursPlayed, setHoursPlayed] = useState(existingLog?.hours_played?.toString() || "")
  const [minutesPlayed, setMinutesPlayed] = useState(existingLog?.minutes_played?.toString() || "")
  const [playedPlatform, setPlayedPlatform] = useState(existingLog?.played_platform_id?.toString() || "")

  useEffect(() => {
    const sw = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (sw > 0) document.body.style.paddingRight = `${sw}px`
    return () => { document.body.style.overflow = ""; document.body.style.paddingRight = "" }
  }, [])

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", fn)
    return () => window.removeEventListener("keydown", fn)
  }, [onClose])

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function handleSave() {
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
        liked,
        status: status || "played",
        playing,
        backlog,
        wishlist,
        startedOn: startedOn || null,
        finishedOn: finishedOn || null,
        replay,
        hoursPlayed: hoursPlayed ? parseInt(hoursPlayed) : null,
        minutesPlayed: minutesPlayed ? parseInt(minutesPlayed) : null,
        platformId: platform ? parseInt(platform) : null,
        playedPlatformId: playedPlatform ? parseInt(playedPlatform) : null,
      }

      const url = isEditing ? "/api/logs/update" : "/api/logs/create"
      if (isEditing) payload.logId = existingLog.id

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        notify(isEditing ? "Log atualizado!" : "Log criado!")
        onClose()
      } else {
        const err = await res.json().catch(() => ({}))
        notify(err.error || "Falha ao salvar.", "error")
      }
    } catch {
      notify("Falha ao salvar.", "error")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    setDeleting(true)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch("/api/logs/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ logId: existingLog.id }),
      })

      if (res.ok) {
        notify("Log excluído!")
        onDeleted?.()
        onClose()
      } else {
        notify("Falha ao excluir.", "error")
      }
    } catch {
      notify("Falha ao excluir.", "error")
    } finally {
      setDeleting(false)
    }
  }

  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] bg-zinc-900 md:border md:border-zinc-700 md:rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex md:hidden items-center justify-between px-4 pt-4 pb-2 border-b border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {game.cover && (
              <img
                src={`https:${game.cover.url}`}
                alt=""
                className="w-8 h-11 rounded object-cover bg-zinc-800 flex-shrink-0"
                draggable={false}
              />
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">{game.name}</h2>
              {releaseYear && <p className="text-xs text-zinc-500">{releaseYear}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-zinc-700 text-zinc-400 flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="hidden md:flex items-start justify-between p-5 pb-3 flex-shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-2xl font-bold text-white leading-tight truncate">
              {game.name}
            </h2>
            {releaseYear && <p className="text-sm text-zinc-500 mt-0.5">{releaseYear}</p>}
          </div>
          <div className="flex flex-col items-center flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer hover:bg-zinc-800/50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-[10px] font-bold text-zinc-600 mt-1.5 uppercase tracking-wide">ESC</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-5 pb-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-5">
            <div className="flex-shrink-0 w-full md:w-44">
              <div className="flex flex-row md:flex-col gap-3 md:gap-0">
                {game.cover ? (
                  <img
                    src={`https:${game.cover.url}`}
                    alt={game.name}
                    className="w-24 sm:w-28 md:w-full rounded-lg bg-zinc-800 select-none flex-shrink-0 hidden md:block"
                    draggable={false}
                  />
                ) : (
                  <div className="w-24 h-36 sm:w-28 sm:h-40 md:w-full md:h-56 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 hidden md:flex">
                    <span className="text-zinc-600 text-xs text-center px-2">{game.name}</span>
                  </div>
                )}

                <div className="flex-1 md:flex-none grid grid-cols-2 md:grid-cols-1 gap-1.5 md:gap-2 md:mt-3 w-full">
                  <div className="col-span-2 md:col-span-1">
                    <StatusSelector status={status} setStatus={setStatus} />
                  </div>

                  <ToggleButton active={playing} onClick={() => setPlaying(!playing)}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    <span className="truncate">Jogando</span>
                  </ToggleButton>

                  <ToggleButton active={backlog} onClick={() => setBacklog(!backlog)}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.331 0 4.467.89 6.064 2.346M12 6.042c1.597-1.456 3.733-2.346 6.064-2.346.938 0 1.948.18 3 .512v14.25A8.987 8.987 0 0018.064 18c-2.331 0-4.467.89-6.064 2.346M12 6.042V20.346" /></svg>
                    <span className="truncate">Backlog</span>
                  </ToggleButton>

                  <ToggleButton active={wishlist} onClick={() => setWishlist(!wishlist)}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                    <span className="truncate">Wishlist</span>
                  </ToggleButton>

                  <div className="col-span-2 md:col-span-1 flex justify-center pt-1 md:pt-2">
                    <button
                      type="button"
                      onClick={() => setLiked(!liked)}
                      className="flex items-center gap-2.5 cursor-pointer transition-all duration-200 py-1.5 px-3 rounded-lg hover:bg-zinc-800/50"
                    >
                      <span className="text-sm text-zinc-400">Curtir</span>
                      <svg
                        className={`w-5 h-5 transition-all duration-200 ${liked ? "text-red-500 scale-110" : "text-zinc-600"}`}
                        fill={liked ? "currentColor" : "none"}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={liked ? 0 : 1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
              </div>

              {activeTab === "review" && (
                <ReviewTabContent
                  rating={rating} setRating={setRating}
                  ratingMode={ratingMode} setRatingMode={setRatingMode}
                  platform={platform} setPlatform={setPlatform}
                  platforms={game.platforms}
                  review={review} setReview={setReview}
                  spoilers={spoilers} setSpoilers={setSpoilers}
                  mastered={mastered} setMastered={setMastered}
                />
              )}

              {activeTab === "dates" && (
                <DatesTabContent
                  startedOn={startedOn} setStartedOn={setStartedOn}
                  finishedOn={finishedOn} setFinishedOn={setFinishedOn}
                />
              )}

              {activeTab === "details" && (
                <DetailsTabContent
                  logTitle={logTitle} setLogTitle={setLogTitle}
                  replay={replay} setReplay={setReplay}
                  hoursPlayed={hoursPlayed} setHoursPlayed={setHoursPlayed}
                  minutesPlayed={minutesPlayed} setMinutesPlayed={setMinutesPlayed}
                  playedPlatform={playedPlatform} setPlayedPlatform={setPlayedPlatform}
                  platforms={game.platforms}
                  onDelete={handleDelete}
                  deleting={deleting}
                  isEditing={isEditing}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-3 px-4 md:px-5 py-3 border-t border-zinc-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded-lg transition-all duration-200 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              submitting
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
                : "bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer shadow-lg shadow-indigo-500/20"
            }`}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-indigo-300 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isEditing ? "Salvar" : "Criar Log"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function ReviewButton({ game }) {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    if (!user || !game?.id) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch("/api/logs/game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ gameId: game.id }),
      })

      if (res.ok) setLogs(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [user, game?.id])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (!user) return null

  const latestLog = logs[0] || null

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          latestLog
            ? "bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
            : "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5"
        }`}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
        {latestLog ? "Editar Log" : "Log"}
      </button>

      {showModal && (
        <LogModal
          game={game}
          existingLog={latestLog}
          onClose={() => { setShowModal(false); fetchLogs() }}
          onDeleted={fetchLogs}
        />
      )}
    </>
  )
}