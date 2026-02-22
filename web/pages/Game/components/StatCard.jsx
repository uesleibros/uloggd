import CountUp from "@components/UI/CountUp"

export function StatCard({ value, label }) {
  if (!value) return null
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-center">
      <div className="text-2xl font-bold text-white">
        <CountUp end={value} />
      </div>
      <div className="text-xs text-zinc-300 mt-1">{label}</div>
    </div>
  )
}