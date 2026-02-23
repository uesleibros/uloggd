import { Link } from "react-router-dom"
import { Shield } from "lucide-react"
import UserDisplay from "@components/User/UserDisplay"

export function UserResult({ user }) {
  return (
    <Link
      to={`/u/${user.username}`}
      className="group flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl hover:bg-zinc-900 hover:border-zinc-700 transition-all"
    >
      <UserDisplay
        user={user}
        size="md"
        showUsername={false}
        showStatus={true}
        showBadges={true}
      />

      <div className="flex items-center gap-2 min-w-0">
        <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
          {user.username}
        </h3>
      </div>
    </Link>
  )
}