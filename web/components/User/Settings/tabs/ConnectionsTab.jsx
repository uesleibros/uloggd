import TwitchSection from "@components/User/Settings/sections/TwitchSection"

export default function ConnectionsTab({ user }) {
	return (
		<div>
			<h2 className="text-lg font-semibold text-white">Conexões</h2>
			<p className="text-sm text-zinc-500 mt-1 mb-6">Conecte suas contas para sincronizar dados e desbloquear recursos.</p>

			<div className="space-y-4 sm:space-y-6">
				<TwitchSection connection={user?.connections?.twitch || null} />
			</div>
		</div>
	)
}
