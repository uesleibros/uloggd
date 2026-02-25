import { AlertTriangle } from "lucide-react"

export default function SpoilerBanner() {
	return (
		<div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
			<AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
			<span className="text-sm text-amber-400 font-medium">Esta review contém spoilers</span>
		</div>
	)
}