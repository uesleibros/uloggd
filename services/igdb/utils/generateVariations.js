const NUMBER_TO_ROMAN = {
  "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v",
  "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
}

const ROMAN_TO_NUMBER = Object.fromEntries(
  Object.entries(NUMBER_TO_ROMAN).map(([k, v]) => [v, k])
)

const KNOWN_PARTS = [
  "mega", "super", "ultra", "mini", "micro", "neo", "bio", "cyber",
  "re", "pre", "un", "non", "anti", "semi", "multi",
  "man", "boy", "girl", "craft", "vania", "world", "land", "star",
  "fire", "ball", "blade", "soul", "souls", "born", "borne", "bound",
  "lock", "break", "dead", "dark", "over", "under", "war", "cross",
  "blood", "iron", "storm", "shadow", "night", "light", "quest",
  "wolf", "dragon", "zone", "field", "gate", "stone", "heart",
  "tower", "castle", "force", "power", "strike", "edge", "doom",
  "front", "grand", "auto", "metal", "gear", "solid", "final",
  "street", "battle", "ring", "tales", "point", "fall", "rise",
  "zero", "prime", "plus", "tale", "side", "hack", "shot",
]

const MIN = 2

function compoundSplits(word) {
  const splits = new Set()
  let hasKnown = false

  for (const part of KNOWN_PARTS) {
    if (word.length <= part.length + 1) continue

    if (word.startsWith(part)) {
      const rest = word.slice(part.length)
      if (rest.length >= MIN) {
        splits.add(`${part} ${rest}`)
        hasKnown = true
      }
    }

    if (word.endsWith(part)) {
      const rest = word.slice(0, -part.length)
      if (rest.length >= MIN) {
        splits.add(`${rest} ${part}`)
        hasKnown = true
      }
    }
  }

  if (!hasKnown && word.length >= 6) {
    for (let i = 3; i <= word.length - 3; i++) {
      splits.add(`${word.slice(0, i)} ${word.slice(i)}`)
    }
  }

  return splits
}

function numeralSwaps(terms) {
  const swaps = new Set()

  for (const v of terms) {
    const roman = v.replace(/\b(\d+)\b/g, (_, n) => NUMBER_TO_ROMAN[n] || n)
    if (roman !== v) swaps.add(roman)

    const arabic = v.replace(
      /\b(i{1,3}|iv|vi{0,3}|ix|x)\b/gi,
      m => ROMAN_TO_NUMBER[m.toLowerCase()] || m
    )
    if (arabic !== v) swaps.add(arabic)
  }

  return swaps
}

export function generateVariations(q) {
  const raw = (q || "").trim()
  if (raw.length < MIN) return []

  const result = new Set()
  const lower = raw.toLowerCase().replace(/\s+/g, " ")

  result.add(lower)

  const camel = raw.replace(/([a-z\d])([A-Z])/g, "$1 $2").toLowerCase()
  if (camel !== lower) result.add(camel)

  if (lower.includes(" ")) {
    result.add(lower.replace(/\s+/g, "-"))
    result.add(lower.replace(/\s+/g, ""))
  }

  if (lower.includes("-")) {
    result.add(lower.replace(/-/g, " "))
    result.add(lower.replace(/-/g, ""))
  }

  const joined = lower.replace(/[\s\-]+/g, "")
  if (joined === lower && joined.length >= MIN * 2) {
    compoundSplits(joined).forEach(s => result.add(s))
  }

  numeralSwaps([...result]).forEach(s => result.add(s))

  result.delete(lower)

  return [...result].filter(v => v.length >= MIN)
}
