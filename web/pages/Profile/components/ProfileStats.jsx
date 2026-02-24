import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Calendar, Twitch, Radio, Gamepad2 } from "lucide-react"
import CountUp from "@components/UI/CountUp"
import SteamAchievements from "./SteamAchievements"

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

function ActivitySection({ stream, userId }) {
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
				if (data.playing) setPresence(data)
			} catch {}
		}

		fetchPresence()
	}, [userId])

	if (!stream && !presence) return null

	return (
		<div className="mt-6">
			<div className="flex items-center gap-2 mb-3">
				<Gamepad2 className="w-4 h-4 text-zinc-500" />
				<span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
					Atividade
				</span>
			</div>

			<div className="flex flex-col sm:flex-row gap-2">
				{stream && (
					<a
						href={`https://twitch.tv/${stream.twitch_username}`}
						target="_blank"
						rel="noopener noreferrer"
						className="group flex items-center gap-3 flex-1 bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/30 hover:border-purple-500/50 rounded-xl px-3.5 py-2.5 transition-all"
					>
						<div className="relative flex-shrink-0">
							<img
								src={stream.thumbnail}
								alt={stream.title}
								className="w-14 h-8 object-cover rounded-md border border-purple-500/20"
							/>
							<div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-red-600 text-white text-[8px] font-bold px-1 py-px rounded shadow-lg">
								<Radio className="w-2 h-2" />
								LIVE
							</div>
						</div>

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5">
								<Twitch className="w-3 h-3 text-purple-400 flex-shrink-0" />
								<span className="text-[11px] font-semibold text-white truncate">
									{stream.game}
								</span>
							</div>
							<div className="text-[10px] text-purple-300/60 mt-0.5">
								{stream.viewers.toLocaleString()} assistindo
							</div>
						</div>
					</a>
				)}

				{presence && (
					<div className="group relative flex items-center gap-3 flex-1 overflow-hidden rounded-xl px-3.5 py-2.5 transition-all border border-zinc-700/50 hover:border-[#66c0f4]/40">
						<div
							className="absolute inset-0 bg-cover bg-center"
							style={{ backgroundImage: `url(${presence.steam.header})` }}
						/>
						<div className="absolute inset-0 bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/80" />

						<div className="relative z-10 flex items-center gap-3 w-full">
							<div className="relative flex-shrink-0">
								<img
									src={presence.game?.cover || presence.steam.header}
									alt={presence.game?.name || presence.steam.name}
									className="w-8 h-11 object-cover rounded-md shadow-lg"
								/>
								<div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5">
									<SteamIcon className="w-3 h-3 text-[#66c0f4]" />
								</div>
							</div>

							<div className="min-w-0 flex-1">
								<div className="text-[11px] font-semibold text-white truncate">
									{presence.game?.name || presence.steam.name}
								</div>
								<div className="text-[10px] text-[#66c0f4] mt-0.5">
									Jogando agora
								</div>
							</div>

							{presence.game?.slug && (
								<Link
									to={`/game/${presence.game.slug}`}
									className="text-[10px] bg-[#66c0f4]/20 hover:bg-[#66c0f4] hover:text-[#171a21] text-[#66c0f4] px-2.5 py-1 rounded-md font-semibold transition-colors flex-shrink-0 backdrop-blur-sm"
								>
									Ver
								</Link>
							)}
						</div>
					</div>
				)}
			</div>
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
			</div>

			<ActivitySection stream={stream} userId={userId} />
			<SteamAchievements userId={userId} />
		</>
	)
}

