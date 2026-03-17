import { supabase } from "#lib/supabase-ssr.js"
import { findManyByIds, resolveStreams, formatListProfile } from "#models/users/index.js"

export async function handleBatch(req, res) {
  const ids = req.query.ids || []
  const idList = Array.isArray(ids) ? ids : [ids]

  if (idList.length === 0) return res.json([])

  try {
    const { data, error } = await supabase
      .from("comments")
      .select("id, content, user_id, parent_id, created_at")
      .in("id", idList)

    if (error) throw error

    const comments = data || []

    const userIds = new Set()
    const parentIds = new Set()

    for (const c of comments) {
      userIds.add(c.user_id)
      if (c.parent_id) parentIds.add(c.parent_id)
    }

    let parentComments = []
    if (parentIds.size > 0) {
      const { data: parents } = await supabase
        .from("comments")
        .select("id, user_id")
        .in("id", [...parentIds])

      parentComments = parents || []
      for (const p of parentComments) {
        userIds.add(p.user_id)
      }
    }

    const parentUserMap = {}
    for (const p of parentComments) {
      parentUserMap[p.id] = p.user_id
    }

    let usersMap = {}
    if (userIds.size > 0) {
      const users = await findManyByIds([...userIds])
      const streamsMap = await resolveStreams(users)

      for (const u of users) {
        usersMap[u.user_id] = formatListProfile(u, { stream: streamsMap[u.user_id] })
      }
    }

    const formatted = comments.map(c => ({
      id: c.id,
      content: c.content,
      parent_id: c.parent_id,
      created_at: c.created_at,
      user: usersMap[c.user_id] || null,
      parent_user: c.parent_id ? usersMap[parentUserMap[c.parent_id]] || null : null
    }))

    res.json(formatted)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
