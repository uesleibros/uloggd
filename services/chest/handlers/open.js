import { supabase } from "#lib/supabase-ssr.js"

const DROP_TABLE = {
  copper:  { min: 5,  max: 15, chance: 1.0  },
  iron:    { min: 3,  max: 8,  chance: 0.8  },
  gold:    { min: 1,  max: 5,  chance: 0.5  },
  emerald: { min: 1,  max: 3,  chance: 0.2  },
  diamond: { min: 1,  max: 2,  chance: 0.08 },
  ruby:    { min: 1,  max: 1,  chance: 0.02 },
}

const MINERALS = Object.keys(DROP_TABLE)

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function generateRewards() {
  const rewards = {}

  for (const [mineral, { min, max, chance }] of Object.entries(DROP_TABLE)) {
    rewards[mineral] = Math.random() <= chance ? roll(min, max) : 0
  }

  if (Object.values(rewards).every((v) => v === 0)) {
    rewards.copper = roll(3, 7)
  }

  return rewards
}

export async function handleOpen(req, res) {
  const userId = req.user.id

  const { data: lastChest } = await supabase
    .from("user_chests")
    .select("opened_at")
    .eq("user_id", userId)
    .eq("chest_type", "daily")
    .order("opened_at", { ascending: false })
    .limit(1)
    .single()

  if (lastChest) {
    const now = new Date()
    const last = new Date(lastChest.opened_at)
    const remaining = 86400000 - (now.getTime() - last.getTime())

    if (remaining > 0) {
      return res.status(429).json({
        error: "chest_cooldown",
        secondsLeft: Math.ceil(remaining / 1000),
      })
    }
  }

  const rewards = generateRewards()

  const { data: current } = await supabase
    .from("user_minerals")
    .select("*")
    .eq("user_id", userId)
    .single()

  const updated = {}
  for (const m of MINERALS) {
    updated[m] = (current?.[m] || 0) + rewards[m]
  }

  const { error: mineralError } = await supabase
    .from("user_minerals")
    .upsert({
      user_id: userId,
      ...updated,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

  if (mineralError) {
    console.error(mineralError)
    return res.status(500).json({ error: "failed_to_update_minerals" })
  }

  const { error: chestError } = await supabase
    .from("user_chests")
    .insert({
      user_id: userId,
      chest_type: "daily",
      rewards,
    })

  if (chestError) {
    console.error(chestError)
    return res.status(500).json({ error: "failed_to_register_chest" })
  }

  await supabase
    .from("mineral_transactions")
    .insert({
      user_id: userId,
      transaction_type: "chest_opened",
      minerals_changed: rewards,
      description: "daily_chest",
    })

  return res.json({ success: true, rewards })
}