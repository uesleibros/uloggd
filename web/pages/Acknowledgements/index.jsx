import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ExternalLink, Heart, Gamepad2, Sparkles, Trophy, Star, Swords, Crown } from "lucide-react"
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
    logo: "https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico",
    color: "#ffffff",
    invertLogo: true,
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
    name: "Decors",
    description: "Avatar decoration service providing profile customization and cosmetic assets.",
    category: "tools",
    url: "https://github.com/decor-discord",
    color: "#f47fff",
    letter: "D",
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
    invertLogo: true,
  },
]

const STATS = [
  { icon: Gamepad2, label: "Technologies", value: ACKNOWLEDGEMENTS.length },
  { icon: Swords, label: "Open Source", value: "100%" },
  { icon: Crown, label: "Made with", value: "♥" },
]

function AcknowledgementCard({ item }) {
  const [imgError, setImgError] = useState(false)
  const useLetter = !item.logo || imgError

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-zinc-800/30 border border-zinc-700/40 hover:border-zinc-600/80 hover:bg-zinc-800/60 transition-all duration-300"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors duration-300"
        style={{
          background: `${item.color}08`,
          borderColor: `${item.color}15`,
        }}
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
            className="w-5 h-5 object-contain"
            style={item.invertLogo ? { filter: "brightness(0) invert(1)", opacity: 0.9 } : undefined}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors">
            {item.name}
          </h3>
          <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-all opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
          {item.description}
        </p>
      </div>

      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(400px circle at 0% 50%, ${item.color}08, transparent 60%)`,
        }}
      />

      <div
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `${item.color}40` }}
      />
    </a>
  )
}

function FloatingDecor({ icon: Icon, className }) {
  return (
    <div className={`absolute pointer-events-none select-none ${className}`}>
      <Icon className="w-4 h-4 text-zinc-800/50" />
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
      <FloatingDecor icon={Gamepad2} className="top-6 right-4 rotate-12 hidden lg:block" />
      <FloatingDecor icon={Trophy} className="top-52 -right-6 -rotate-12 hidden lg:block" />
      <FloatingDecor icon={Star} className="top-[28rem] -left-6 rotate-[25deg] hidden lg:block" />
      <FloatingDecor icon={Sparkles} className="bottom-40 -right-4 rotate-6 hidden lg:block" />
      <FloatingDecor icon={Swords} className="bottom-72 -left-8 -rotate-12 hidden lg:block" />

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="mb-10">
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Acknowledgements</h1>
            <p className="text-xs text-zinc-600 mt-0.5">Credits & open source</p>
          </div>
        </div>
        <p className="text-sm text-zinc-500 leading-relaxed max-w-lg">
          uloggd wouldn't exist without the amazing open source community. Here are the projects and services that make everything possible.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {STATS.map((stat, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 py-4 rounded-xl bg-zinc-800/20 border border-zinc-800/60"
          >
            <stat.icon className="w-4 h-4 text-zinc-600" />
            <span className="text-lg font-bold text-white">{stat.value}</span>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === cat.id
                ? "bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/20"
                : "bg-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
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
        <div className="text-center py-20">
          <Gamepad2 className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
          <p className="text-sm text-zinc-600">No acknowledgements in this category.</p>
        </div>
      )}

      <div className="mt-12 p-5 bg-zinc-800/20 border border-zinc-800/50 rounded-xl text-center">
        <p className="text-xs text-zinc-600 mb-1">
          Built with <span className="text-pink-400/80">♥</span> by the uloggd team
        </p>
        <p className="text-xs text-zinc-600">
          Think we missed something?{" "}
          <a
            href="mailto:uloggd.gg@gmail.com"
            className="text-indigo-400/80 hover:text-indigo-300 hover:underline transition-colors"
          >
            Let us know
          </a>
        </p>
      </div>
    </div>
  )
}
