import { useState, useEffect } from "react"
import { ExternalLink, Unlink, Loader2, CheckCircle2, Radio, Tv } from "lucide-react"
import { useAuth } from "#hooks/useAuth"
import { supabase } from "#lib/supabase"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"

function TwitchIcon({ className }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor">
			<path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
		</svg>
	)
}

export default function TwitchSection() {
	const { user } = useAuth()
	const [connection, setConnection] = useState(null)
	const [loading, setLoading] = useState(true)
	const [connecting, setConnecting] = useState(false)
	const [disconnecting, setDisconnecting] = useState(false)

	useEffect(() => {
		if (user?.id) fetchStatus()
	}, [user?.id])

	async function fetchStatus() {
		try {
			const res = await fetch("/api/twitch/status", {
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

	function handleConnect() {
		setConnecting(true)
		const returnUrl = encodeURIComponent(window.location.pathname)
		window.location.href = `/api/twitch/auth?userId=${user.id}&returnUrl=${returnUrl}`
	}

	async function handleDisconnect() {
		setDisconnecting(true)
		try {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return

			const res = await fetch("/api/twitch/disconnect", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.access_token}`,
				},
			})

			if (res.ok) {
				setConnection(null)
			}
		} catch {
		} finally {
			setDisconnecting(false)
		}
	}

	if (loading) {
		return (
			<SettingsSection title="Twitch">
				<div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-xl bg-zinc-700 animate-pulse" />
						<div className="flex-1 space-y-2">
							<div className="h-4 w-20 bg-zinc-700 rounded animate-pulse" />
							<div className="h-3 w-48 bg-zinc-700 rounded animate-pulse" />
						</div>
					</div>
				</div>
			</SettingsSection>
		)
	}

	const isConnected = !!connection

	return (
		<SettingsSection title="Twitch">
			<div className={`p-4 rounded-lg border transition-colors ${
				isConnected 
					? "bg-purple-500/5 border-purple-500/20" 
					: "bg-zinc-800/30 border-zinc-700/50"
			}`}>
				<div className="flex items-start gap-4">
					<div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
						isConnected ? "bg-purple-500" : "bg-zinc-700"
					}`}>
						<TwitchIcon className="w-6 h-6 text-white" />
					</div>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<span className="text-sm font-medium text-white">Twitch</span>
							{isConnected && (
								<span className="flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
									<CheckCircle2 className="w-3 h-3" />
									Conectado
								</span>
							)}
						</div>

						{isConnected ? (
							<>
								<div className="flex items-center gap-2 mb-3">
									<img 
										src={connection.avatar} 
										alt={connection.username}
										className="w-5 h-5 rounded-full"
									/>
									<span className="text-sm text-zinc-300">{connection.displayName}</span>
									{connection.isLive && (
										<span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
											<Radio className="w-3 h-3" />
											Ao vivo
										</span>
									)}
								</div>

								{connection.isLive && connection.stream && (
									<div className="mb-3 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
										<div className="flex items-center gap-2 text-xs text-zinc-400">
											<Tv className="w-3.5 h-3.5" />
											<span className="truncate">{connection.stream.title}</span>
										</div>
										<div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
											<span>{connection.stream.game}</span>
											<span>•</span>
											<span>{connection.stream.viewers.toLocaleString()} viewers</span>
										</div>
									</div>
								)}

								<p className="text-xs text-zinc-500 mb-3">
									Sua conta da Twitch está conectada. Mostramos quando você está ao vivo no seu perfil.
								</p>
							</>
						) : (
							<p className="text-xs text-zinc-500 mb-3">
								Conecte sua conta da Twitch para mostrar quando você está ao vivo e sincronizar seus dados.
							</p>
						)}

						<div className="flex items-center gap-2 flex-wrap">
							{isConnected ? (
								<>
									<a
										href={`https://twitch.tv/${connection.username}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
									>
										<ExternalLink className="w-3.5 h-3.5" />
										Ver canal
									</a>
									<button
										onClick={handleDisconnect}
										disabled={disconnecting}
										className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent rounded-lg transition-colors cursor-pointer disabled:opacity-50"
									>
										{disconnecting ? (
											<Loader2 className="w-3.5 h-3.5 animate-spin" />
										) : (
											<Unlink className="w-3.5 h-3.5" />
										)}
										Desconectar
									</button>
								</>
							) : (
								<button
									onClick={handleConnect}
									disabled={connecting}
									className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
								>
									{connecting ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<TwitchIcon className="w-4 h-4" />
									)}
									Conectar Twitch
								</button>
							)}
						</div>
					</div>
				</div>

				{!isConnected && (
					<div className="mt-4 pt-4 border-t border-zinc-700/50">
						<h4 className="text-xs font-medium text-zinc-400 mb-2">O que você ganha:</h4>
						<ul className="space-y-1.5">
							<li className="flex items-center gap-2 text-xs text-zinc-500">
								<CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
								Indicador de "Ao vivo" quando estiver streamando
							</li>
							<li className="flex items-center gap-2 text-xs text-zinc-500">
								<CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
								Link direto para seu canal no perfil
							</li>
						</ul>
					</div>
				)}
			</div>
		</SettingsSection>
	)
}
