import { useState } from "react"
import { User, Mail, Hash, ShieldCheck, Pencil, Check, X, Loader2 } from "lucide-react"
import SettingsSection from "@components/User/Settings/ui/SettingsSection"
import InfoField from "@components/User/Settings/ui/InfoField"
import Badge from "@components/User/Settings/ui/Badge"
import UserBadges from "@components/User/UserBadges"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"
import { getStatus } from "#utils/onlineStatus"

function getCooldownDays(changedAt) {
	if (!changedAt) return 0
	const diff = Date.now() - new Date(changedAt).getTime()
	const remaining = 30 * 86400000 - diff
	return remaining > 0 ? Math.ceil(remaining / 86400000) : 0
}

export default function ProfileSection({ user, onUsernameSave, usernameSaving }) {
	const [editing, setEditing] = useState(false)
	const [newUsername, setNewUsername] = useState(user.username)
	const isModerator = user.is_moderator
	const cooldown = getCooldownDays(user.username_changed_at)

	async function handleSave() {
		const trimmed = newUsername.trim()
		if (!trimmed || trimmed === user.username) {
			setEditing(false)
			return
		}

		const success = await onUsernameSave(trimmed)
		if (success) setEditing(false)
	}

	function handleCancel() {
		setNewUsername(user.username)
		setEditing(false)
	}

	return (
		<SettingsSection title="Perfil">
			<div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mb-4 sm:mb-5">
				<AvatarWithDecoration
					src={user.avatar}
					alt={user.username}
					decoration={user.avatar_decoration}
					status={getStatus(user.last_seen, user.status)}
					size="xl"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-base sm:text-lg font-semibold text-white truncate">{user.username}</span>
						<UserBadges user={user} size="lg" />
					</div>
					<span className="text-xs sm:text-sm text-zinc-500 truncate block mt-0.5">{user.email}</span>
				</div>
			</div>

			<div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-700/50 bg-zinc-800/30 mb-2">
				<User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
				<span className="text-xs text-zinc-500 flex-shrink-0">Nome de usuário</span>
				<div className="flex-1 flex items-center justify-end gap-2 min-w-0">
					{editing ? (
						<>
							<input
								type="text"
								value={newUsername}
								onChange={(e) => setNewUsername(e.target.value.slice(0, 32))}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSave()
									if (e.key === "Escape") handleCancel()
								}}
								autoFocus
								disabled={usernameSaving}
								className="flex-1 min-w-0 px-2 py-1 bg-zinc-900 border border-zinc-600 rounded text-sm text-white focus:outline-none focus:border-zinc-500"
							/>
							<button
								onClick={handleSave}
								disabled={usernameSaving}
								className="p-1.5 text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors cursor-pointer disabled:opacity-50"
							>
								{usernameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
							</button>
							<button
								onClick={handleCancel}
								disabled={usernameSaving}
								className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 rounded transition-colors cursor-pointer disabled:opacity-50"
							>
								<X className="w-4 h-4" />
							</button>
						</>
					) : (
						<>
							<span className="text-sm text-white truncate">{user.username}</span>
							{cooldown > 0 ? (
								<span className="text-[10px] text-zinc-600 flex-shrink-0">
									{cooldown}d restantes
								</span>
							) : (
								<button
									onClick={() => setEditing(true)}
									className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/50 rounded transition-colors cursor-pointer"
								>
									<Pencil className="w-3.5 h-3.5" />
								</button>
							)}
						</>
					)}
				</div>
			</div>

			<InfoField label="Email" value={user.email.replace(/(.{2})(.*)(@.*)/, "$1****$3")} icon={<Mail className="w-4 h-4" />} />
			<InfoField label="ID Discord" value={user.discordId} icon={<Hash className="w-4 h-4" />} />
			<InfoField
				label="Verificação"
				value={
					<div className="flex items-center gap-2">
						{isModerator && <Badge text="Moderador" color="blue" />}
					</div>
				}
				icon={<ShieldCheck className="w-4 h-4" />}
			/>
		</SettingsSection>
	)
}