import { NOISE_WORDS, MIN_NAME_SCORE } from "./constants.js"

function norm(str) {
  if (!str) return ""
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['':\-–—.!?]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function strip(str) {
  return norm(str).split(" ").filter(w => !NOISE_WORDS.has(w)).join(" ")
}

function extractWords(str) {
  return norm(str).split(" ").filter(w => w.length >= 2)
}

function wordOverlap(a, b) {
  const aw = strip(a).split(" ").filter(w => w.length >= 2)
  const bw = strip(b).split(" ").filter(w => w.length >= 2)
  if (aw.length === 0 || bw.length === 0) return 0

  const matched = bw.filter(w => aw.some(x => x === w)).length
  return matched / Math.max(aw.length, bw.length)
}

function similarity(a, b) {
  const an = norm(a)
  const bn = norm(b)
  const ac = strip(a)
  const bc = strip(b)

  if (an === bn) return 500
  if (ac === bc) return 450

  let s = 0

  if (an.startsWith(bn + " ") || bn.startsWith(an + " ")) s += 350
  else if (ac.startsWith(bc + " ") || bc.startsWith(ac + " ")) s += 320
  else if (an.startsWith(bn) || bn.startsWith(an)) s += 300
  else if (ac.startsWith(bc) || bc.startsWith(ac)) s += 280
  else if (an.includes(bn) || bn.includes(an)) s += 200
  else if (ac.includes(bc) || bc.includes(ac)) s += 180

  const aw = ac.split(" ").filter(w => w.length >= 2)
  const bw = bc.split(" ").filter(w => w.length >= 2)

  if (bw.length > 0) {
    const matched = bw.filter(w => aw.some(x => x === w || x.includes(w) || w.includes(x))).length
    const ratio = matched / bw.length
    s += ratio * 100
    if (ratio < 0.3 && s < 200) return 0
  }

  s -= Math.min(Math.abs(ac.length - bc.length) * 2, 80)

  if (s > 0 && wordOverlap(a, b) === 0 && an !== bn) return 0

  return s
}

function bestNameScore(hltbGame, allNames) {
  let best = 0

  for (const n of allNames) {
    best = Math.max(best, similarity(hltbGame.game_name, n))
  }

  if (hltbGame.game_alias) {
    const aliases = hltbGame.game_alias.split(",").map(s => s.trim()).filter(Boolean)
    for (const alias of aliases) {
      for (const n of allNames) {
        best = Math.max(best, similarity(alias, n))
      }
    }
  }

  return best
}

export function scoreGame(g, name, altNames, year) {
  const allNames = [name, ...(altNames || [])]
  const nameScore = bestNameScore(g, allNames)

  if (nameScore < MIN_NAME_SCORE) return -1

  let s = nameScore

  if (year && g.release_world) {
    const diff = Math.abs(g.release_world - year)
    if (diff === 0) s += 100
    else if (diff === 1) s += 60
    else if (diff === 2) s += 20
    else s -= diff * 15
  }

  if (g.count_comp > 1000) s += 20
  else if (g.count_comp > 100) s += 10

  return s
}

export function buildQueries(name, altNames) {
  const seen = new Set()
  const queries = []

  const push = (terms) => {
    if (terms.length === 0) return
    const key = terms.join("|")
    if (seen.has(key)) return
    seen.add(key)
    queries.push(terms)
  }

  const allNames = [name, ...(altNames || [])]

  for (const n of allNames) {
    const full = extractWords(n)
    const clean = strip(n).split(" ").filter(w => w.length >= 2)

    push(full)
    push(clean)

    if (full.length > 2) push(full.slice(0, -1))
    if (clean.length > 2) push(clean.slice(0, -1))
    if (full.length > 3) push(full.slice(0, Math.ceil(full.length * 0.6)))
  }

  return queries
}