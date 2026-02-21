import { supabase } from "#lib/supabase-ssr.js"
import { uploadToImgchest } from "#services/users/utils/imgchest.js"
import { VALID_BANNER_ACTIONS } from "#services/users/constants.js"

export async function handleBanner(req, res) {
  const { action, image } = req.body

  if (!VALID_BANNER_ACTIONS.includes(action))
    return res.status(400).json({ error: "invalid action" })

  try {
    if (action === "remove") {
      const { error } = await supabase
        .from("users")
        .update({ banner: null })
        .eq("user_id", req.user.id)

      if (error) throw error
      return res.json({ banner: null })
    }

    if (!image) return res.status(400).json({ error: "no image" })

    const bannerUrl = await uploadToImgchest(image)

    const { error } = await supabase
      .from("users")
      .update({ banner: bannerUrl })
      .eq("user_id", req.user.id)

    if (error) throw error
    res.json({ banner: bannerUrl })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "fail" })
  }
}
