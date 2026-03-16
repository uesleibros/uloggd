import { supabase } from "#lib/supabase-ssr.js"
import { findManyByIds, resolveStreams, formatUserMap } from "#models/users/index.js"

export async function handleGet(req, res) {
  const { reviewId } = req.query
  if (!reviewId) return res.status(400).json({ error: "reviewId required" })

  try {
    const { data: review, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .single()

    if (error?.code === "PGRST116") return res.status(404).json({ error: "not found" })
    if (error) throw error

    const profiles = await findManyByIds([review.user_id])
    const streamsMap = await resolveStreams(profiles)
    const users = formatUserMap(profiles, streamsMap)

    let journey = null
    if (review.journey_id) {
      const { data: journeyData } = await supabase
        .from("journeys")
        .select(`
          id, title, platform_id, created_at,
          journey_entries(id, played_on, hours, minutes)
        `)
        .eq("id", review.journey_id)
        .single()

      if (journeyData) {
        const entries = journeyData.journey_entries || []
        const totalMinutes = entries.reduce((acc, e) => acc + (e.hours || 0) * 60 + (e.minutes || 0), 0)
        const sortedDates = entries.map(e => e.played_on).sort()

        journey = {
          id: journeyData.id,
          title: journeyData.title,
          platform_id: journeyData.platform_id,
          total_sessions: entries.length,
          total_minutes: totalMinutes,
          first_session: sortedDates[0] || null,
          last_session: sortedDates[sortedDates.length - 1] || null,
        }
      }
    }

    res.json({
      review,
      user: users[review.user_id] || null,
      journey,
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
