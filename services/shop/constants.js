const VALID_SLOTS = [
  "avatar_decoration",
  "banner",
  "profile_effect",
  "badge_1",
  "badge_2",
  "badge_3",
  "name_color",
  "theme",
]

const TYPE_TO_SLOTS = {
  avatar_decoration: ["avatar_decoration"],
  banner: ["banner"],
  profile_effect: ["profile_effect"],
  badge: ["badge_1", "badge_2", "badge_3"],
  name_color: ["name_color"],
  theme: ["theme"],
}

const MINERALS = ["copper", "iron", "gold", "emerald", "diamond", "ruby"]

export { VALID_SLOTS, TYPE_TO_SLOTS, MINERALS }