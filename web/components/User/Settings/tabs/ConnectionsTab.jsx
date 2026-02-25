import TwitchSection from "@components/User/Settings/sections/connections/TwitchSection"
import NintendoSection from "@components/User/Settings/sections/connections/NintendoSection"
import SteamSection from "@components/User/Settings/sections/connections/SteamSection"

export default function ConnectionsTab() {
	return (
		<div>
			<h2 className="text-lg font-semibold text-white">Conexões</h2>
			<p className="text-sm text-zinc-500 mt-1 mb-6">
				Conecte suas contas para sincronizar dados e desbloquear recursos.
			</p>

			<div className="space-y-6">
				<TwitchSection />
				<SteamSection />
				<NintendoSection />
			</div>
		</div>
	)
}