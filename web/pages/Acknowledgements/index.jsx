import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ExternalLink, Heart, Gamepad2, Sparkles, Trophy, Star } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"
import { useTranslation } from "#hooks/useTranslation"
import Translatable from "@components/UI/Translatable"

const CATEGORIES = [
  { id: "all", labelKey: "categories.all" },
  { id: "infrastructure", labelKey: "categories.infrastructure" },
  { id: "data", labelKey: "categories.data" },
  { id: "libraries", labelKey: "categories.libraries" },
  { id: "tools", labelKey: "categories.tools" },
]

const ACKNOWLEDGEMENTS = [
  {
    name: "IGDB",
    description: "Game database powering all game metadata, covers, screenshots and information across uloggd.",
    category: "data",
    url: "https://www.igdb.com",
    logo: "https://www.igdb.com/favicon.ico",
    color: "#9147ff",
  },
  {
    name: "Twitch",
    description: "OAuth authentication provider and live streaming data for user profiles and game streams.",
    category: "data",
    url: "https://www.twitch.tv",
    logo: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png",
    color: "#9147ff",
  },
  {
    name: "Steam",
    description: "Game library imports, user profile integration, current promotions and pricing information.",
    category: "data",
    url: "https://store.steampowered.com",
    logo: "https://store.steampowered.com/favicon.ico",
    color: "#1b2838",
  },
  {
    name: "PlayStation Network",
    description: "Trophy syncing, game library imports and user profile integration for PlayStation platforms.",
    category: "data",
    url: "https://www.playstation.com",
    logo: "https://www.playstation.com/favicon.ico",
    color: "#003791",
    letter: "PSN",
  },
  {
    name: "RetroAchievements",
    description: "Retro game achievement tracking and integration for classic gaming libraries and profiles.",
    category: "data",
    url: "https://retroachievements.org",
    logo: "https://static.retroachievements.org/assets/images/ra-icon.webp",
    color: "#cc9900",
  },
  {
    name: "IsThereAnyDeal",
    description: "Historical pricing data and deal tracking powering the game price history features.",
    category: "data",
    url: "https://isthereanydeal.com",
    color: "#4078c0",
    letter: "ITAD",
  },
  {
    name: "Supabase",
    description: "Open source backend providing authentication, database, storage and real-time subscriptions.",
    category: "infrastructure",
    url: "https://supabase.com",
    logo: "https://supabase.com/favicon/favicon-32x32.png",
    color: "#3ecf8e",
  },
  {
    name: "Vercel",
    description: "Cloud platform hosting and deploying uloggd with edge functions and global CDN.",
    category: "infrastructure",
    url: "https://vercel.com",
    color: "#ffffff",
    letter: "▲",
  },
  {
    name: "NXAPI",
    description: "Unofficial Nintendo Switch Online API client enabling Nintendo account integrations and play activity.",
    category: "data",
    url: "https://github.com/samuelthomas2774/nxapi",
    color: "#e60012",
    letter: "NX",
  },
  {
    name: "Imgchest",
    description: "Image hosting service for user-uploaded screenshots, covers and media content.",
    category: "infrastructure",
    url: "https://imgchest.com",
    logo: "https://cdn.imgchest.com/logo_icon.png",
    color: "#4a9eff",
  },
  {
    name: "Decors",
    description: "Avatar decoration service providing profile customization and cosmetic assets.",
    category: "tools",
    url: "https://github.com/decor-discord",
    color: "#f47fff",
    letter: "D",
  },
  {
    name: "DEV.to",
    description: "Developer blogging platform powering the uloggd blog and development updates.",
    category: "tools",
    url: "https://dev.to",
    logo: "https://dev-to-uploads.s3.amazonaws.com/uploads/logos/resized_logo_UQww2soKuUsjaOGNB38o.png",
    color: "#ffffff",
  },
  {
    name: "Lucide",
    description: "Beautiful and consistent icon library providing all icons used throughout uloggd.",
    category: "libraries",
    url: "https://lucide.dev",
    logo: "https://lucide.dev/logo.light.svg",
    color: "#f56565",
  },
  {
    name: "Twemoji",
    description: "Open source emoji library providing consistent cross-platform emoji rendering.",
    category: "libraries",
    url: "https://github.com/jdecked/twemoji",
    color: "#1da1f2",
    letter: "🐦",
  },
  {
    name: "CodeMirror",
    description: "Versatile code and text editor component powering the markdown and code editing experience.",
    category: "libraries",
    url: "https://codemirror.net",
    logo: "https://codemirror.net/favicon.ico",
    color: "#d30707",
  },
  {
    name: "gif.js",
    description: "JavaScript GIF encoder enabling client-side animated GIF creation and export.",
    category: "libraries",
    url: "https://github.com/jnordberg/gif.js",
    color: "#00b300",
    letter: "GIF",
  },
  {
    name: "Framer Motion",
    description: "Production-ready motion library powering animations and transitions throughout the interface.",
    category: "libraries",
    url: "https://motion.dev",
    logo: "https://framerusercontent.com/images/48ha9ZR9oZQGQ6gZ8YUfElP3T0A.png",
    color: "#bb4bff",
  },
]

function AcknowledgementCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const useLetter = !item.logo || imgError

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-start gap-4 p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/70 transition-all duration-300"
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 border border-zinc-700/50 overflow-hidden"
        style={{ background: `${item.color}10` }}
      >
        {useLetter ? (
          <span
            className="text-xs font-bold tracking-tight"
            style={{ color: item.color }}
          >
            {item.letter || item.name[0]}
          </span>
        ) : (
          <img
            src={item.logo}
            alt=""
            className="w-6 h-6 object-contain"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {item.name}
          </h3>
          <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100" />
        </div>
        <div onClick={e => e.preventDefault()}>
          <Translatable className="text-xs text-zinc-500 leading-relaxed">
            {item.description}
          </Translatable>
        </div>
      </div>

      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${item.color}06, transparent 40%)`,
        }}
      />
    </a>
  )
}

function FloatingIcon({ icon: Icon, className }) {
  return (
    <div className={`absolute text-zinc-800/40 pointer-events-none select-none ${className}`}>
      <Icon className="w-5 h-5" />
    </div>
  )
}

export default function AcknowledgementsPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const { t } = useTranslation("acknowledgements")

  usePageMeta({
    title: `${t("title")} - uloggd`,
    description: t("description"),
  })

  const filtered = activeCategory === "all"
    ? ACKNOWLEDGEMENTS
    : ACKNOWLEDGEMENTS.filter(a => a.category === activeCategory)

  return (
    <div className="py-8 sm:py-12 max-w-3xl mx-auto relative">
      <FloatingIcon icon={Gamepad2} className="top-4 right-8 rotate-12 hidden sm:block" />
      <FloatingIcon icon={Trophy} className="top-48 right-2 -rotate-6 hidden sm:block" />
      <FloatingIcon icon={Star} className="top-96 left-0 rotate-45 hidden sm:block" />
      <FloatingIcon icon={Sparkles} className="bottom-32 right-12 rotate-12 hidden sm:block" />

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToHome")}
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <Heart className="w-6 h-6 text-pink-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("title")}</h1>
      </div>

      <p className="text-sm text-zinc-500 mb-8 ml-0.5">
        {t("description")}
      </p>

      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeCategory === cat.id
                ? "bg-indigo-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            {t(cat.labelKey)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(item => (
          <AcknowledgementCard key={item.name} item={item} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Gamepad2 className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">{t("empty")}</p>
        </div>
      )}

      <div className="mt-10 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500 text-center">
          {t("missing")}{" "}
          <a
            href="mailto:uloggd.gg@gmail.com"
            className="text-indigo-400 hover:underline"
          >
            {t("letUsKnow")}
          </a>
        </p>
      </div>
    </div>
  )
}
