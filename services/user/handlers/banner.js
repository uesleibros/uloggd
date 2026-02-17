import { supabase } from "../../../lib/supabase-ssr.js"
import { getUser } from "../../../utils/auth.js"
import { uploadToImgchest } from "../utils/imgchest.js"
import { VALID_BANNER_ACTIONS } from "../constants.js"

export async function handleBanner(req, res) {
  const user = await getUser(req)
  if (!user) return res.status(401).json({ error: "unauthorized" })

  const { action, image } = req.body

  if (!VALID_BANNER_ACTIONS.includes(action))
    return res.status(400).json({ error: "invalid action" })

  try {
    if (action === "remove") {
      const { error } = await supabase
        .from("users")
        .update({ banner: null })
        .eq("user_id", user.id)

      if (error) throw error
      return res.json({ banner: null })
    }

    if (!image) return res.status(400).json({ error: "no image" })

    const bannerUrl = await uploadToImgchest(image)

    const { error } = await supabase
      .from("users")
      .update({ banner: bannerUrl })
      .eq("user_id", user.id)

    if (error) throw error
    res.json({ banner: bannerUrl })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}