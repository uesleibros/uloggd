const IMGCHEST_API_KEY = process.env.IMGCHEST_API_KEY

export async function uploadToImgchest(base64) {
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
    headers: { Authorization: `Bearer ${IMGCHEST_API_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`imgchest error: ${text}`)
  }

  const data = await res.json()
  return data.data.images[0].link
}