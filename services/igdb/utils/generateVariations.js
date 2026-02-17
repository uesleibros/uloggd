const NUMBER_TO_ROMAN = {
  "1": "i", "2": "ii", "3": "iii", "4": "iv", "5": "v",
  "6": "vi", "7": "vii", "8": "viii", "9": "ix", "10": "x",
}

const ROMAN_TO_NUMBER = Object.fromEntries(
  Object.entries(NUMBER_TO_ROMAN).map(([k, v]) => [v, k])
)

const PREFIX_MAP = {
  "re": ["re-", "re "], "pre": ["pre-", "pre "], "un": ["un-", "un "],
  "non": ["non-", "non "], "mega": ["mega "], "super": ["super "],
  "ultra": ["ultra "], "mini": ["mini "], "micro": ["micro "],
  "neo": ["neo "], "bio": ["bio "], "cyber": ["cyber "],
}

const SUFFIX_MAP = {
  "man": [" man"], "boy": [" boy"], "craft": [" craft"], "vania": [" vania"],
  "world": [" world"], "land": [" land"], "star": [" star"], "fire": [" fire"],
  "ball": [" ball"], "blade": [" blade"], "soul": [" soul"], "born": [" born"],
  "bound": [" bound"],
}

function applyNumeralSwaps(variations) {
  variations.forEach(v => {
    const withRoman = v.replace(/\b(\d+)\b/g, (_, n) => NUMBER_TO_ROMAN[n] || n)
    if (withRoman !== v) variations.add(withRoman)

    const withArabic = v.replace(
      /\b(i{1,3}|iv|vi{0,3}|ix|x)\b/gi,
      m => ROMAN_TO_NUMBER[m.toLowerCase()] || m
    )
    if (withArabic !== v) variations.add(withArabic)
  })
}

function applyAffixSwaps(variations, affixMap, mode) {
  variations.forEach(v => {
    for (const [affix, replacements] of Object.entries(affixMap)) {
      if (mode === "prefix") {
        if (v.startsWith(affix) && v.length > affix.length && v[affix.length] !== " " && v[affix.length] !== "-") {
          replacements.forEach(r => variations.add(r + v.slice(affix.length)))
        }
        replacements.forEach(r => {
          if (v.startsWith(r)) variations.add(affix + v.slice(r.length))
        })
      } else {
        if (v.endsWith(affix) && v.length > affix.length) {
          const before = v.slice(0, -affix.length)
          if (before[before.length - 1] !== " " && before[before.length - 1] !== "-") {
            replacements.forEach(r => variations.add(before + r))
          }
        }
        replacements.forEach(r => {
          if (v.endsWith(r)) variations.add(v.slice(0, -r.length) + affix)
        })
      }
    }
  })
}

export function generateVariations(q) {
  const variations = new Set()
  const lower = q.toLowerCase().trim()

  variations.add(lower)
  variations.add(lower.replace(/\s+/g, ""))
  variations.add(lower.replace(/([a-z])([A-Z])/g, "$1 $2"))

  if (!lower.includes(" ")) {
    for (let i = 2; i <= lower.length - 2; i++) {
      variations.add(lower.slice(0, i) + " " + lower.slice(i))
    }
  }

  if (lower.includes(" ")) {
    variations.add(lower.replace(/\s+/g, "-"))
    variations.add(lower.replace(/\s+/g, ""))
  }
  if (lower.includes("-")) {
    variations.add(lower.replace(/-/g, " "))
    variations.add(lower.replace(/-/g, ""))
  }

  applyNumeralSwaps(variations)
  applyAffixSwaps(variations, PREFIX_MAP, "prefix")
  applyAffixSwaps(variations, SUFFIX_MAP, "suffix")

  return [...variations].filter(v => v.length >= 2)
}