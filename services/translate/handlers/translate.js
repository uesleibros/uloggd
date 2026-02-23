export async function handleTranslate(req, res) {
	const { text, target = "pt" } = req.body

	if (!text || typeof text !== "string") {
		return res.status(400).json({ error: "missing text" })
	}

	if (text.length > 5000) {
		return res.status(400).json({ error: "text too long" })
	}

	try {
		const response = await fetch(
			`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
		)

		const data = await response.json()

		if (!Array.isArray(data) || !data[0]) {
			return res.status(500).json({ error: "invalid response" })
		}

		const translation = data[0]
			.map(item => item[0])
			.join("")

		const detectedLang = data[2]

		return res.json({
			translation,
			detectedLang
		})

	} catch (e) {
		console.error(e)
		return res.status(500).json({ error: "translation failed" })
	}
}