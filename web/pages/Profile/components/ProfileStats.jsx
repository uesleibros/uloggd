import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Calendar, Twitch, Radio } from "lucide-react"
import CountUp from "@components/UI/CountUp"

function SteamIcon({ className }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 259" className={className} fill="currentColor">
			<path d="M127.779 0C57.895 0 .847 55.32.044 124.669l69.07 28.576a36.104 36.104 0 0 1 20.57-6.36c.67 0 1.333.027 1.993.067l30.776-44.573v-.626C122.453 75.088 144.2 53.34 170.864 53.34c26.663 0 48.412 21.748 48.412 48.412 0 26.664-21.749 48.412-48.412 48.412h-1.107l-43.874 31.292c0 .584.033 1.16.033 1.721 0 20.149-16.355 36.503-36.503 36.503-17.55 0-32.352-12.579-35.747-29.292L5.06 163.84C21.26 217.234 70.96 256.3 129.893 256.3c71.222 0 128.893-57.67 128.893-128.893C258.786 57.67 199 0 127.779 0zM80.17 196.07l-15.826-6.552a27.345 27.345 0 0 0 14.143 13.46 27.44 27.44 0 0 0 35.81-14.772 27.253 27.253 0 0 0 .046-20.943 27.108 27.108 0 0 0-14.82-14.865 27.29 27.29 0 0 0-20.152-.339l16.337 6.768c10.283 4.276 15.16 16.128 10.884 26.41-4.275 10.284-16.134 15.16-26.423 10.833zm112.593-94.318c0-13.326-10.85-24.176-24.176-24.176-13.327 0-24.177 10.85-24.177 24.176 0 13.327 10.85 24.177 24.177 24.177 13.326 0 24.176-10.85 24.176-24.177zm-42.3 0c0-10.038 8.093-18.131 18.124-18.131s18.131 8.093 18.131 18.131-8.1 18.131-18.131 18.131-18.124-8.093-18.124-18.131z" />
		</svg>
	)
}

function SocialCount({ value, label, onClick }) {
	return (
		<button onClick={onClick} className="text-sm hover:opacity-80 transition-opacity cursor-pointer">
			<span className="font-semibold text-white">
				<CountUp end={value} />
			</span>
			<span className="text-zinc-500 ml-1">{label}</span>
		</button>
	)
}

function StatCard({ value, label }) {
	return (
		<div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center">
			<div className="text-2xl font-bold text-white">
				<CountUp end={value} />
			</div>
			<div className="text-xs text-zinc-300 mt-1">{label}</div>
		</div>
	)
}

function StreamActivity({ stream }) {
	if (!stream) return null

	return (
		<a
			href={`https://twitch.tv/${stream.twitch_username}`}
			target="_blank"
			rel="noopener noreferrer"
			className="col-span-2 flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 rounded-lg px-4 py-3 transition-colors"
		>
			<img
				src={stream.thumbnail}
				alt={stream.title}
				className="w-16 h-9 object-cover rounded border border-purple-500/30 flex-shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 mb-0.5">
					<Twitch className="w-3.5 h-3.5 text-purple-400" />
					<span className="text-xs font-medium text-purple-400">
						{stream.twitch_username}
					</span>
					<span className="flex items-center gap-0.5 text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-medium">
						<Radio className="w-2.5 h-2.5" />
						LIVE
					</span>
				</div>
				<div className="text-sm text-white font-medium truncate">{stream.game}</div>
				<div className="text-xs text-zinc-400">{stream.viewers.toLocaleString()} assistindo</div>
			</div>
		</a>
	)
}

function SteamActivity({ userId }) {
	const [presence, setPresence] = useState(null)

	useEffect(() => {
		if (!userId) return

		const fetchPresence = async () => {
			try {
				const res = await fetch("/api/steam/presence", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId }),
				})
				const data = await res.json()
				if (data.playing) {
					setPresence(data)
				}
			} catch {}
		}

		fetchPresence()
	}, [userId])

	if (!presence) return null

	const gameName = presence.game?.name || presence.steam.name
	const gameSlug = presence.game?.slug
	const cover = presence.game?.cover || presence.steam.header

	return (
		<div className="col-span-2 flex items-center gap-3 bg-[#171a21]/60 border border-[#2a475e]/50 rounded-lg px-4 py-3">
			<img
				src={cover}
				alt={gameName}
				className="w-9 h-12 object-cover rounded border border-[#2a475e] flex-shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 mb-0.5">
					<SteamIcon className="w-3.5 h-3.5 text-[#66c0f4]" />
					<span className="text-[10px] uppercase font-semibold text-[#66c0f4]">
						Jogando agora
					</span>
				</div>
				<div className="text-sm text-white font-medium truncate">{gameName}</div>
			</div>
			{gameSlug && (
				<Link
					to={`/game/${gameSlug}`}
					className="text-xs bg-[#2a475e] hover:bg-[#66c0f4] hover:text-[#171a21] text-[#66c0f4] px-3 py-1.5 rounded font-medium transition-colors flex-shrink-0"
				>
					Ver jogo
				</Link>
			)}
		</div>
	)
}

export default function ProfileStats({
	counts,
	followersCount,
	followingCount,
	memberSince,
	onFollowersClick,
	onFollowingClick,
	followsYou = false,
	stream,
	userId,
}) {
	return (
		<>
			<div className="flex items-center gap-3 sm:gap-5 mt-3 flex-wrap">
				<SocialCount value={followersCount} label="seguidores" onClick={onFollowersClick} />
				<SocialCount value={followingCount} label="seguindo" onClick={onFollowingClick} />

				{followsYou && (
					<span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
						Segue você
					</span>
				)}

				{memberSince && (
					<span className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5">
						<Calendar className="w-3.5 h-3.5" />
						{memberSince}
					</span>
				)}
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
				<StatCard value={counts.playing} label="Jogando" />
				<StatCard value={counts.played} label="Jogados" />
				<StatCard value={counts.backlog} label="Backlog" />
				<StatCard value={counts.rated} label="Avaliados" />

				<StreamActivity stream={stream} />
				<SteamActivity userId={userId} />
			</div>
		</>
	)
}
