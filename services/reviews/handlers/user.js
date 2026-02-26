import { supabase } from "#lib/supabase-ssr.js"

export async function handleUser(req, res) {
  const { userId, status, page = 1, limit = 20 } = req.query
  if (!userId) return res.status(400).json({ error: "userId required" })

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  try {
    let q = supabase
      .from("reviews")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (status) q = q.eq("status", status)

    const { data, count, error } = await q
    if (error) throw error

    res.json({
      reviews: data || [],
      total: count,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}