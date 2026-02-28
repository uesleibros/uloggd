import { MessageSquare } from "lucide-react"
import { useTranslation } from "#hooks/useTranslation"

export default function ReviewEmptyState({ title, subtitle }) {
	const { t } = useTranslation("review.empty")

	return (
		<div className="rounded-xl p-10 sm:p-14 bg-zinc-800/50 border border-zinc-700 flex flex-col items-center justify-center gap-4">
			<div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
				<MessageSquare className="w-6 h-6 text-zinc-600" />
			</div>
			<div className="text-center">
				<p className="text-sm text-zinc-400 font-medium">{title || t("title")}</p>
				<p className="text-sm text-zinc-600 mt-1">{subtitle || t("subtitle")}</p>
			</div>
		</div>
	)
}
