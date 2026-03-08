import { handleCategories } from "#services/shop/handlers/categories.js"
import { handleItems } from "#services/shop/handlers/items.js"
import { handleItem } from "#services/shop/handlers/item.js"
import { handleArtists } from "#services/shop/handlers/artists.js"
import { handleCollections } from "#services/shop/handlers/collections.js"
import { handleInventory } from "#services/shop/handlers/inventory.js"
import { handleEquipped } from "#services/shop/handlers/equipped.js"
import { handlePurchase } from "#services/shop/handlers/purchase.js"
import { handleGift } from "#services/shop/handlers/gift.js"
import { handleEquip } from "#services/shop/handlers/equip.js"
import { handleUnequip } from "#services/shop/handlers/unequip.js"
import { handleAdminCollections } from "#services/shop/handlers/admin/collections.js"
import { handleAdminCategories } from "#services/shop/handlers/admin/categories.js"
import { handleAdminItems } from "#services/shop/handlers/admin/items.js"
import { handleAdminCollectionItems } from "#services/shop/handlers/admin/collectionItems.js"
import { handleAdminArtists } from "#services/shop/handlers/admin/artists.js"
import { getUser } from "#lib/auth.js"

const ACTIONS = {
  categories:  { handler: handleCategories,  method: "GET",  auth: false },
  items:       { handler: handleItems,       method: "GET",  auth: false },
  item:        { handler: handleItem,        method: "GET",  auth: false },
  artists:     { handler: handleArtists,     method: "GET",  auth: false },
  collections: { handler: handleCollections, method: "GET",  auth: false },
  inventory:   { handler: handleInventory,   method: "GET",  scopes: ["@me"], auth: true },
  equipped:    { handler: handleEquipped,    method: "GET",  auth: false },
  purchase:    { handler: handlePurchase,    method: "POST", scopes: ["@me"], auth: true },
  gift:        { handler: handleGift,        method: "POST", scopes: ["@me"], auth: true },
  equip:       { handler: handleEquip,       method: "POST", scopes: ["@me"], auth: true },
  unequip:     { handler: handleUnequip,     method: "POST", scopes: ["@me"], auth: true },
}

const ADMIN_ACTIONS = {
  collections:     { handler: handleAdminCollections },
  categories:      { handler: handleAdminCategories },
  items:           { handler: handleAdminItems },
  "collection-items": { handler: handleAdminCollectionItems },
  artists:         { handler: handleAdminArtists },
}

export async function shopHandler(req, res) {
  if (req.scope === "admin") {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (!user.is_moderator) return res.status(403).json({ error: "forbidden" })
    req.user = user

    const adminEntry = ADMIN_ACTIONS[req.action]
    if (!adminEntry) return res.status(404).json({ error: "action_not_found" })

    return adminEntry.handler(req, res)
  }

  const entry = ACTIONS[req.action]
  if (!entry) return res.status(404).json({ error: "action_not_found" })

  if (req.method !== entry.method) return res.status(405).end()

  if (entry.scopes && !entry.scopes.includes(req.scope)) {
    return res.status(400).json({ error: "invalid_scope" })
  }

  if (entry.auth) {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: "unauthorized" })
    if (user.is_banned) return res.status(403).json({ error: "banned" })
    req.user = user
  }

  return entry.handler(req, res)
}