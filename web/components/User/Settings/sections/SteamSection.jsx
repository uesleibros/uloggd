import { useState, useEffect } from "react"
import { CheckCircle2, Unlink, Loader2 } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

export function SteamIcon({ className }) {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 256 259"
			fill="currentColor"
		>
			<path d="M127.779 0C57.895 0 .847 55.32.044 124.669l69.07 28.576a36.104 36.104 0 0 1 20.57-6.36c.67 0 1.333.027 1.993.067l30.776-44.573v-.626C122.453 75.088 144.2 53.34 170.864 53.34c26.663 0 48.412 21.748 48.412 48.412 0 26.664-21.749 48.412-48.412 48.412h-1.107l-43.874 31.292c0 .584.033 1.16.033 1.721 0 20.149-16.355 36.503-36.503 36.503-17.55 0-32.352-12.579-35.747-29.292L5.06 163.84C21.26 217.234 70.96 256.3 129.893 256.3c71.222 0 128.893-57.67 128.893-128.893C258.786 57.67 199 0 127.779 0zM80.17 196.07l-15.826-6.552a27.345 27.345 0 0 0 14.143 13.46 27.44 27.44 0 0 0 35.81-14.772 27.253 27.253 0 0 0 .046-20.943 27.108 27.108 0 0 0-14.82-14.865 27.29 27.29 0 0 0-20.152-.339l16.337 6.768c10.283 4.276 15.16 16.128 10.884 26.41-4.275 10.284-16.134 15.16-26.423 10.833zm112.593-94.318c0-13.326-10.85-24.176-24.176-24.176-13.327 0-24.177 10.85-24.177 24.176 0 13.327 10.85 24.177 24.177 24.177 13.326 0 24.176-10.85 24.176-24.177zm-42.3 0c0-10.038 8.093-18.131 18.124-18.131s18.131 8.093 18.131 18.131-8.1 18.131-18.131 18.131-18.124-8.093-18.124-18.131z" />
		</svg>
	)
}

export default function SteamSection() {
	const { user } = useAuth()
	const [connection, setConnection] = useState(null)
	const [loading, setLoading] = useState(true)
	const [connecting, setConnecting] = useState(false)
	const [removing, setRemoving] = useState(false)

	useEffect(() => {
		if (user?.id) fetchConnection()
	}, [user?.id])

	async function fetchConnection() {
		try {
			const res = await fetch("/api/steam/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.id }),
			})

			const data = await res.json()

			if (data.connected) {
				setConnection(data)
			} else {
				setConnection(null)
			}
		} catch {
			setConnection(null)
		} finally {
			setLoading(false)
		}
	}

	async function handleConnect() {
		setConnecting(true)

		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return

			const res = await fetch("/api/steam/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ userId: user.id }),
			})

			const data = await res.json()

			if (res.ok && data.url) {
				window.location.href = data.url
			}
		} catch (error) {
			console.error(error)
		} finally {
			setConnecting(false)
		}
	}

	async function handleRemove() {
		setRemoving(true)

		try {
			const { data: { session } } = await supabase.auth.getSession()
			
			const res = await fetch("/api/steam/disconnect", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${session.access_token}`,
				},
				body: JSON.stringify({ userId: user.id })
			})

			if (res.ok) {
				setConnection(null)
			}
		} finally {
			setRemoving(false)
		}
	}

	if (loading) {
		return (
			<SettingsSection title="Steam">
				<div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 animate-pulse h-24" />
			</SettingsSection>
		)
	}

	const isConnected = !!connection

	return (
		<SettingsSection title="Steam">
			<div className={`p-4 rounded-lg border transition-colors ${
				isConnected
					? "bg-blue-500/5 border-blue-500/20"
					: "bg-zinc-800/30 border-zinc-700/50"
			}`}>
				<div className="flex items-start gap-4">
					<div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
						isConnected ? "bg-transparent" : "bg-[#171a21]"
					}`}>
						{isConnected && connection.avatar ? (
							<img src={connection.avatar} alt="Steam Avatar" className="w-full h-full object-cover" />
						) : (
							<SteamIcon className="w-7 h-7 text-white" />
						)}
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-2">
							<span className="text-sm font-medium text-white">
								Steam
							</span>
							{isConnected && (
								<span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
									<CheckCircle2 className="w-3 h-3" />
									Conectado
								</span>
							)}
						</div>

						{isConnected ? (
							<>
								<div className="text-sm font-semibold text-white mb-1">
									{connection.nickname}
								</div>
								<div className="text-xs text-zinc-500 mb-3">
									ID: {connection.steamId}
								</div>

								<button
									onClick={handleRemove}
									disabled={removing}
									className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
								>
									{removing
										? <Loader2 className="w-3.5 h-3.5 animate-spin" />
										: <Unlink className="w-3.5 h-3.5" />
									}
									Desconectar
								</button>
							</>
						) : (
							<>
								<p className="text-xs text-zinc-400 mb-3">
									Conecte sua conta Steam para exibir seus jogos e estatísticas no seu perfil.
								</p>

								<button
									onClick={handleConnect}
									disabled={connecting}
									className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#171a21] hover:bg-[#2a2f3a] border border-zinc-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
								>
									{connecting
										? <Loader2 className="w-4 h-4 animate-spin" />
										: <SteamIcon className="w-4 h-4 text-white" />
									}
									Conectar com a Steam
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</SettingsSection>
	)

}
