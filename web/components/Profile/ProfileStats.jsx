import { Calendar } from "lucide-react"
import CountUp from "@components/UI/CountUp"

function SocialCount({ value, label, onClick }) {
  return (
    <button onClick={onClick} className="text-sm hover:opacity-80 transition-opacity cursor-pointer">
      <span className="font-semibold text-white">
        <CountUp end={value} />
      </span>
      <span className="text-zinc-500 ml-1">{label}</span>
    </button>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">
        <CountUp end={value} />
      </div>
      <div className="text-xs text-zinc-300 mt-1">{label}</div>
    </div>
  );
}

export default function ProfileStats({ 
  counts, 
  followersCount, 
  followingCount, 
  memberSince, 
  onFollowersClick, 
  onFollowingClick,
  followsYou = false
}) {
  return (
    <>
      <div className="flex items-center gap-3 sm:gap-5 mt-3 flex-wrap">
        <SocialCount value={followersCount} label="seguidores" onClick={onFollowersClick} />
        <SocialCount value={followingCount} label="seguindo" onClick={onFollowingClick} />
        
        {followsYou && (
          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-700">
            Segue você
          </span>
        )}
        
        {memberSince && (
          <span className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {memberSince}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard value={counts.playing} label="Jogando" />
        <StatCard value={counts.played} label="Jogados" />
        <StatCard value={counts.backlog} label="Backlog" />
        <StatCard value={counts.rated} label="Avaliados" />
      </div>
    </>
  )
}