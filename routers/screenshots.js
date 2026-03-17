import { handleUpload } from "#services/screenshots/handlers/upload.js"
import { handleList } from "#services/screenshots/handlers/list.js"
import { handleUpdate } from "#services/screenshots/handlers/update.js"
import { handleDelete } from "#services/screenshots/handlers/delete.js"
import { handleReorder } from "#services/screenshots/handlers/reorder.js"
import { handleGet } from "#services/screenshots/handlers/get.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
	get:     { handler: handleGet,     method: "GET",  auth: false },
	upload:  { handler: handleUpload,  method: "POST", auth: true  },
	list:    { handler: handleList,    method: "GET",  auth: false },
	update:  { handler: handleUpdate,  method: "POST", auth: true  },
	delete:  { handler: handleDelete,  method: "POST", auth: true  },
	reorder: { handler: handleReorder, method: "POST", auth: true  },
}

export async function screenshotsHandler(req, res) {
	const entry = ACTIONS[req.action]
	if (!entry) return res.status(404).json({ error: "action not found" })

	if (req.method !== entry.method) return res.status(405).end()

	if (entry.auth) {
		const user = await getUser(req)

		if (!user) return res.status(401).json({ error: "unauthorized" })
		if (user.is_banned) return res.status(403).json({ error: "banned" })

		req.user = user
	}

	return entry.handler(req, res)
}