import { supabase } from "../../lib/supabase-ssr.js"

const IMGCHEST_API_KEY = process.env.IMGCHEST_API_KEY

async function uploadToImgchest(base64) {
  const matches = base64.match(/^data:(.+);base64,(.+)$/)
  if (!matches) throw new Error("invalid base64")

  const mimeType = matches[1]
  const buffer = Buffer.from(matches[2], "base64")
  const blob = new Blob([buffer], { type: mimeType })

  const formData = new FormData()
  formData.append("images[]", blob, "banner.jpg")
  formData.append("privacy", "hidden")

  const res = await fetch("https://api.imgchest.com/v1/post", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${IMGCHEST_API_KEY}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`imgchest error: ${text}`)
  }

  const data = await res.json()
  return data.data.images[0].link
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const token = req.headers.authorization?.replace("Bearer ", "")
  if (!token) return res.status(401).json({ error: "unauthorized" })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: "unauthorized" })

  const { action, image } = req.body

  try {
    if (action === "remove") {
      const { error } = await supabase
        .from("users")
        .update({ banner: null })
        .eq("user_id", user.id)

      if (error) throw error
      return res.json({ banner: null })
    }

    if (action === "upload") {
      if (!image) return res.status(400).json({ error: "no image" })

      const bannerUrl = await uploadToImgchest(image)

      const { error } = await supabase
        .from("users")
        .update({ banner: bannerUrl })
        .eq("user_id", user.id)

      if (error) throw error
      return res.json({ banner: bannerUrl })
    }

    return res.status(400).json({ error: "invalid action" })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}