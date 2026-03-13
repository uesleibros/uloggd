import { supabase } from "#lib/supabase-ssr.js"
import { query } from "#lib/igdbWrapper.js"

const BATCH_SIZE = 25
const CONCURRENCY = 1
const MIN_MATCH_SCORE = 40
const RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000

const PLATFORM_MAP = {
  "PS5": 167,
  "PlayStation 5": 167,
  "PS4": 48,
  "PlayStation 4": 48,
  "PS3": 9,
  "PlayStation 3": 9,
  "PS Vita": 46,
  "PSVITA": 46,
  "PSP": 38,
}

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/:\s+/g, ": ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(remaster(ed)?|goty|edition|definitive|ultimate|deluxe|complete|game of the year)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function bigrams(str) {
  const set = new Set()
  for (let i = 0; i < str.length - 1; i++) {
    set.add(str.slice(i, i + 2))
  }
  return set
}

function dice(a, b) {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0

  const biA = bigrams(a)
  const biB = bigrams(b)
  let intersection = 0

  for (const bg of biA) {
    if (biB.has(bg)) intersection++
  }

  return (2 * intersection) / (biA.size + biB.size)
}

function scoreMatch(psnGame, igdbGame) {
  const psnNorm = normalize(psnGame.name)
  const igdbNorm = normalize(igdbGame.name)

  let score = 0

  if (psnNorm === igdbNorm) {
    score += 100
  } else {
    score += Math.round(dice(psnNorm, igdbNorm) * 70)
  }

  if (igdbGame.alternative_names) {
    for (const alt of igdbGame.alternative_names) {
      const altNorm = normalize(alt.name)
      if (psnNorm === altNorm) {
        score += 80
        break
      }
      if (dice(psnNorm, altNorm) > 0.8) {
        score += 40
        break
      }
    }
  }

  const expectedPlatform = PLATFORM_MAP[psnGame.platform]
  if (expectedPlatform && igdbGame.platforms?.some(p => p.id === expectedPlatform)) {
    score += 30
  }

  return score
}

function sanitizeForIGDB(name) {
  return name
    .replace(/["\\;]/g, "")
    .replace(/[™®©]/g, "")
    .trim()
    .slice(0, 100)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function queryWithRetry(endpoint, body, attempt = 1) {
  try {
    return await query(endpoint, body)
  } catch (error) {
    const isTooManyRequests = error.message?.includes("Too Many Requests") || 
                              error.message?.includes("429")
    
    if (isTooManyRequests && attempt <= RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY * Math.pow(2, attempt - 1) // Exponential backoff
      console.log(`Rate limited, waiting ${delay}ms before retry ${attempt}/${RETRY_ATTEMPTS}`)
      await sleep(delay)
      return queryWithRetry(endpoint, body, attempt + 1)
    }
    
    throw error
  }
}

async function mapConcurrent(items, fn, limit) {
  const results = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i], i)
      await sleep(100)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function processOne(game, userId) {
  const searchName = sanitizeForIGDB(game.name)
  if (!searchName) return { status: "skipped" }

  try {
    const results = await queryWithRetry("games", `
      fields id, slug, name, platforms.id, alternative_names.name;
      search "${searchName}";
      limit 10;
    `)

    if (!results?.length) return { status: "skipped" }

    let best = null
    let bestScore = 0

    for (const igdbGame of results) {
      const score = scoreMatch(game, igdbGame)
      if (score > bestScore) {
        bestScore = score
        best = igdbGame
      }
    }

    if (!best || bestScore < MIN_MATCH_SCORE) {
      return { status: "skipped" }
    }

    const hasProgress = game.progress > 0
    const isCompleted = game.progress === 100

    const { error } = await supabase
      .from("user_games")
      .upsert({
        user_id: userId,
        game_id: best.id,
        game_slug: best.slug,
        status: isCompleted ? "played" : hasProgress ? "playing" : null,
        playing: hasProgress && !isCompleted
      }, { onConflict: "user_id,game_id" })

    if (error) return { status: "failed" }
    return { status: "imported" }
  } catch (error) {
    console.error(`Failed to process "${game.name}":`, error.message)
    return { status: "failed" }
  }
}

export async function handleProcess(req, res) {
  const { job_id } = req.body
  if (!job_id) return res.status(400).json({ error: "missing job_id" })

  const { data: job } = await supabase
    .from("import_jobs")
    .select("id, status, progress, total, imported, skipped, failed, games_data")
    .eq("id", job_id)
    .eq("user_id", req.user.id)
    .single()

  if (!job || job.status !== "running") {
    return res.status(400).json({ error: "invalid job" })
  }

  const games = job.games_data ?? []
  const start = job.progress
  const batch = games.slice(start, start + BATCH_SIZE)

  if (batch.length === 0) {
    await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        games_data: null,
      })
      .eq("id", job_id)

    return res.json({ status: "completed" })
  }

  const results = await mapConcurrent(
    batch,
    (game) => processOne(game, req.user.id),
    CONCURRENCY,
  )

  const counts = { imported: 0, skipped: 0, failed: 0 }
  for (const r of results) {
    counts[r.status]++
  }

  const newProgress = start + batch.length

  await supabase
    .from("import_jobs")
    .update({
      progress: newProgress,
      imported: job.imported + counts.imported,
      skipped: job.skipped + counts.skipped,
      failed: job.failed + counts.failed,
    })
    .eq("id", job_id)

  return res.json({
    status: "running",
    total: job.total,
    progress: newProgress,
    imported: job.imported + counts.imported,
    skipped: job.skipped + counts.skipped,
    failed: job.failed + counts.failed,
  })
}
