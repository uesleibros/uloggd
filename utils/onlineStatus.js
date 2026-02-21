export function getStatus(lastSeen, status) {
  if (!lastSeen) return "offline"
  const stale = Date.now() - new Date(lastSeen).getTime() > 5 * 60 * 1000
  if (stale) return "offline"
  return status || "offline"
}