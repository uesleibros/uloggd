import { Calendar, ArrowRight } from "lucide-react"
import UserBadges from "@components/User/UserBadges"
import AvatarWithDecoration from "@components/User/AvatarWithDecoration"

export function ProfileContent({ profile }) {
  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null

  return (
    <>
      <div className="h-28 relative overflow-hidden">
        {profile.banner ? (
          <img
            src={profile.banner}
            alt=""
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-zinc-800 to-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />
      </div>

      <div className="px-5 -mt-10 relative">
        <AvatarWithDecoration
          src={profile.avatar}
          alt={profile.username}
          decoration={profile.avatar_decoration}
          size="xl"
        />
      </div>

      <div className="px-5 pt-3 pb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white truncate">{profile.username}</h3>
          <UserBadges user={profile} size="lg" />
        </div>

        {profile.pronoun && (
          <span className="inline-block text-xs mt-1 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
            {profile.pronoun}
          </span>
        )}

        {memberSince && (
          <p className="text-xs text-zinc-600 mt-2.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            Membro desde {memberSince}
          </p>
        )}

        <a
          href={`/u/${profile.username}`}
          className="mt-4 w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          Ver perfil completo
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </a>
      </div>
    </>
  )
}
