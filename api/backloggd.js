import { handleStart } from "../services/backloggd/handlers/start.js"
import { handleStatus } from "../services/backloggd/handlers/status.js"
import { handleProcess } from "../services/backloggd/handlers/process.js"
import { handleCancel } from "../services/backloggd/handlers/cancel.js"

const ACTIONS = {
  start: handleStart,
  status: handleStatus,
  process: handleProcess,
  cancel: handleCancel,
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end()

  const fn = ACTIONS[req.query.action]
  if (!fn) return res.status(404).json({ error: "Action not found" })

  return fn(req, res)
}