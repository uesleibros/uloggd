import { supabase } from "#lib/supabase-ssr.js"
import { findManyByIds, resolveStreams, formatListProfile } from "#models/users/index.js"
import { getCommentConfig } from "../config.js"

export async function handleList(req, res) {
  const { type, targetId, page = 1, limit = 20 } = req.query

  const config = getCommentConfig(type)
  if (!config) return res.status(400).json({ error: "invalid type" })
  if (!targetId) return res.status(400).json({ error: "missing targetId" })

  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  try {
    const { data, count } = await supabase
      .from("comments")
      .select("*", { count: "exact" })
      .eq("target_type", type)
      .eq("target_id", String(targetId))
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1)

    const comments = data || []
    const userIds = [...new Set(comments.map(c => c.user_id))]

    let usersMap = {}

    if (userIds.length > 0) {
      const users = await findManyByIds(userIds)
      const streamsMap = await resolveStreams(users)

      users.forEach(u => {
        usersMap[u.user_id] = formatListProfile(u, { stream: streamsMap[u.user_id] })
      })
    }

    const formatted = comments.map(c => ({
      ...c,
      user: usersMap[c.user_id] || null
    }))

    res.json({
      comments: formatted,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum)
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}