import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ExternalLink, Heart, Gamepad2, Sparkles, Trophy, Star } from "lucide-react"
import usePageMeta from "#hooks/usePageMeta"

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "data", label: "Data & APIs" },
  { id: "libraries", label: "Libraries" },
  { id: "tools", label: "Tools" },
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
    name: "RetroAchievements",
    description: "Retro game achievement tracking and integration for classic gaming libraries and profiles.",
    category: "data",
    url: "https://retroachievements.org",
    logo: "https://retroachievements.org/favicon.webp",
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
    color: "#4a9eff",
    letter: "IC",
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
    name: "React",
    description: "JavaScript library for building the entire uloggd user interface with component-based architecture.",
    category: "libraries",
    url: "https://react.dev",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/64px-React-icon.svg.png",
    color: "#61dafb",
  },
  {
    name: "Vite",
    description: "Next generation frontend build tool providing instant HMR and optimized production builds.",
    category: "tools",
    url: "https://vite.dev",
    logo: "https://vite.dev/logo.svg",
    color: "#bd34fe",
  },
  {
    name: "Tailwind CSS",
    description: "Utility-first CSS framework used for styling every component and page on the site.",
    category: "libraries",
    url: "https://tailwindcss.com",
    logo: "https://tailwindcss.com/favicons/favicon-32x32.png",
    color: "#38bdf8",
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
    name: "React Router",
    description: "Declarative routing library handling all client-side navigation and URL management.",
    category: "libraries",
    url: "https://reactrouter.com",
    logo: "https://reactrouter.com/favicon-dark.png",
    color: "#f44250",
  },
  {
    name: "Framer Motion",
    description: "Production-ready motion library powering animations and transitions throughout the interface.",
    category: "libraries",
    url: "https://motion.dev",
    logo: "https://framerusercontent.com/images/48ha9ZR9oZQGQ6gZ8YUfElP3T0A.png",
    color: "#bb4bff",
  },
  {
    name: "GitHub",
    description: "Version control and collaboration platform hosting the uloggd source code and issue tracking.",
    category: "tools",
    url: "https://github.com",
    logo: "https://github.githubassets.com/favicons/favicon-dark.svg",
    color: "#ffffff",
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
        <p className="text-xs text-zinc-500 leading-relaxed">{item.description}</p>
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

  usePageMeta({
    title: "Acknowledgements - uloggd",
    description: "Credits and acknowledgements for the open source projects and services that power uloggd.",
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
        Back to home
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
          <Heart className="w-6 h-6 text-pink-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Acknowledgements</h1>
      </div>

      <p className="text-sm text-zinc-500 mb-8 ml-0.5">
        uloggd is built on the shoulders of incredible open source projects and services. We are grateful to every one of them.
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
            {cat.label}
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
          <p className="text-sm text-zinc-600">No acknowledgements in this category.</p>
        </div>
      )}

      <div className="mt-10 p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
        <p className="text-sm text-zinc-500 text-center">
          Think we missed something?{" "}
          <a
            href="mailto:uloggd.gg@gmail.com"
            className="text-indigo-400 hover:underline"
          >
            Let us know
          </a>
        </p>
      </div>
    </div>
  )
}
