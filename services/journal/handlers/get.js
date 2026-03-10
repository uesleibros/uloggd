import { supabase } from "#lib/supabase-ssr.js"

export async function handleGet(req, res) {
  const journeyId = Number(req.query.journeyId)

  if (!journeyId || isNaN(journeyId))
    return res.status(400).json({ error: "invalid journeyId" })

  try {
    const { data: journey, error: journeyError } = await supabase
      .from("journeys")
      .select(`
        *,
        users!inner(username, avatar)
      `)
      .eq("id", journeyId)
      .single()

    if (journeyError || !journey)
      return res.status(404).json({ error: "journey not found" })

    const { data: entries, error: entriesError } = await supabase
      .from("journey_entries")
      .select("*")
      .eq("journey_id", journeyId)
      .order("played_on", { ascending: true })

    if (entriesError) throw entriesError

    const totalMinutes = entries.reduce((acc, e) => {
      return acc + (e.hours || 0) * 60 + (e.minutes || 0)
    }, 0)

    res.json({
      ...journey,
      entries,
      stats: {
        total_sessions: entries.length,
        total_minutes: totalMinutes,
        total_hours: Math.floor(totalMinutes / 60),
        first_session: entries[0]?.played_on || null,
        last_session: entries[entries.length - 1]?.played_on || null,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
