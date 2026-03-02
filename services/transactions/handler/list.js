import { supabase } from "#lib/supabase-ssr.js"

export async function handleTransactionsList(req, res) {
  const { userId, page = 1, limit = 20 } = req.query

  if (!userId) return res.status(400).json({ error: "userId required" })

  const pageNum = Number(page)
  const limitNum = Math.min(Number(limit), 50)
  const offset = (pageNum - 1) * limitNum

  try {
    const { data, error, count } = await supabase
      .from("mineral_transactions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (error) throw error

    res.json({
      transactions: data || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}