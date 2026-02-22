import { supabase } from "#lib/supabase-ssr.js"

const MIN_USERNAME = 2
const MAX_USERNAME = 32
const USERNAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.]*[a-zA-Z0-9]$/
const INVALID_PATTERNS = /\.\./

export async function handleUsername(req, res) {
  const { username } = req.body

  if (!username || typeof username !== "string")
    return res.status(400).json({ error: "Nome de usuário não pode ser vazio" })

  const trimmed = username.trim().toLowerCase()

  if (trimmed.length < MIN_USERNAME)
    return res.status(400).json({ error: `Mínimo ${MIN_USERNAME} de caracteres` })

  if (trimmed.length > MAX_USERNAME)
    return res.status(400).json({ error: `Máximo ${MAX_USERNAME} de caracteres` })

  if (!USERNAME_REGEX.test(trimmed) || INVALID_PATTERNS.test(trimmed))
    return res.status(400).json({ error: "Nome de usuário inválido" })

	const { data: profile } = await supabase
		.from("users")
		.select("username_changed_at")
		.eq("user_id", req.user.id)
		.single()

	if (profile?.username_changed_at) {
		const last = new Date(profile.username_changed_at).getTime()
		const remaining = COOLDOWN_DAYS * 86400000 - (Date.now() - last)

		if (remaining > 0) {
			const days = Math.ceil(remaining / 86400000)
			return res.status(429).json({ error: `Espere ${days} dias para alterar novamente`, days })
		}
	}

	const { data: taken } = await supabase
		.from("users")
		.select("user_id")
		.ilike("username", trimmed)
		.neq("user_id", req.user.id)
		.maybeSingle()

	if (taken) return res.status(409).json({ error: "Esse nome de usuário já foi obtido" })

	const { error } = await supabase
		.from("users")
		.update({
			username: trimmed,
			username_changed_at: new Date().toISOString(),
		})
		.eq("user_id", req.user.id)

	if (error) {
		console.error(error)
		return res.status(500).json({ error: "fail" })
	}

	res.json({ username: trimmed })
}