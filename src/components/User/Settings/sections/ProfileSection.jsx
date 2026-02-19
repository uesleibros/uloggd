import { User, Mail, Hash, ShieldCheck } from "lucide-react"
import SettingsSection from "../ui/SettingsSection"
import InfoField from "../ui/InfoField"
import Badge from "../ui/Badge"
import UserBadges from "../../UserBadges"
import AvatarWithDecoration from "../../AvatarWithDecoration"

export default function ProfileSection({ user }) {
  const isModerator = user.is_moderator

  return (
    <SettingsSection title="Perfil">
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-zinc-900/50 rounded-lg border border-zinc-700/50 mb-4 sm:mb-5">
        <AvatarWithDecoration src={user.avatar} alt={user.username} decoration={user.avatar_decoration} size="xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base sm:text-lg font-semibold text-white truncate">{user.username}</span>
            <UserBadges user={user} size="lg" />
          </div>
          <span className="text-xs sm:text-sm text-zinc-500 truncate block mt-0.5">{user.email}</span>
        </div>
      </div>

      <InfoField label="Nome de usuário" value={user.username} icon={<User className="w-4 h-4" />} />
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
