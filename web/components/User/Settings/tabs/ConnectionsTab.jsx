import TwitchSection from "@components/User/Settings/sections/TwitchSection"
import NintendoSection from "@components/User/Settings/sections/NintendoSection"

export default function ConnectionsTab() {
	return (
		<div>
			<h2 className="text-lg font-semibold text-white">Conexões</h2>
			<p className="text-sm text-zinc-500 mt-1 mb-6">
				Conecte suas contas para sincronizar dados e desbloquear recursos.
			</p>

			<div className="space-y-6">
				<TwitchSection />
				<NintendoSection />
			</div>
		</div>
	)
}