export async function handleConnect(req, res) {
	return res.status(410).json({ error: "use_lookup_and_verify" })
}
