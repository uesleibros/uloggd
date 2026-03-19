export const GAME_TYPES = {
  0: "main",
  1: "dlc",
  2: "expansion",
  3: "bundle",
  4: "standalone",
  5: "mod",
  6: "episode",
  7: "season",
  8: "remake",
  9: "remaster",
  10: "expanded",
  11: "port",
  12: "fork",
  13: "pack",
  14: "update",
}

export function getGameType(typeId) {
  return GAME_TYPES[typeId] || "main"
}
