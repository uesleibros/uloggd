import { Link } from "react-router-dom"

export function Mention({ username }) {
  return (
    <Link
      to={`/u/${username}`}
      className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded text-sm font-medium transition-colors cursor-pointer no-underline"
    >
      @{username}
    </Link>
  )
}