import { supabase } from "../../lib/supabase-ssr.js"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const { userId, status, page = 1, limit = 20 } = req.body
  if (!userId) return res.status(400).json({ error: "userId required" })

  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from("logs")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)

    const { data, count, error } = await query

    if (error) throw error

    res.json({
      logs: data || [],
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "failed to fetch logs" })
  }
}
