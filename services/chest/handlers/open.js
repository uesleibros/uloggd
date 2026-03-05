import { supabase } from "#lib/supabase-ssr.js"

const DROP_TABLE = {
  copper: { min: 5, max: 15, chance: 1.0 },
  iron: { min: 3, max: 8, chance: 0.8 },
  gold: { min: 1, max: 5, chance: 0.5 },
  emerald: { min: 1, max: 3, chance: 0.2 },
  diamond: { min: 1, max: 2, chance: 0.08 },
  ruby: { min: 1, max: 1, chance: 0.02 },
}

function generateRewards() {
  const rewards = {}

  for (const [mineral, config] of Object.entries(DROP_TABLE)) {
    if (Math.random() <= config.chance) {
      rewards[mineral] = Math.floor(
        Math.random() * (config.max - config.min + 1) + config.min
      )
    } else {
      rewards[mineral] = 0
    }
  }

  if (Object.values(rewards).every((v) => v === 0)) {
    rewards.copper = Math.floor(Math.random() * 5) + 3
  }

  return rewards
}

export async function handleOpen(req, res) {
  const { data: lastChest } = await supabase
    .from("user_chests")
    .select("opened_at")
    .eq("user_id", req.user.id)
    .eq("chest_type", "daily")
    .order("opened_at", { ascending: false })
    .limit(1)
    .single()

  if (lastChest) {
    const now = new Date()
    const lastOpened = new Date(lastChest.opened_at)

    const todayMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ))

    if (lastOpened >= todayMidnight) {
      const tomorrowMidnight = new Date(todayMidnight)
      tomorrowMidnight.setUTCDate(tomorrowMidnight.getUTCDate() + 1)

      return res.status(429).json({
        error: "chest_cooldown",
        secondsLeft: Math.floor((tomorrowMidnight - now) / 1000),
      })
    }
  }

  const rewards = generateRewards()

  const { data: currentMinerals } = await supabase
    .from("user_minerals")
    .select("*")
    .eq("user_id", req.user.id)
    .single()

  if (currentMinerals) {
    const { error: updateError } = await supabase
      .from("user_minerals")
      .update({
        copper: currentMinerals.copper + rewards.copper,
        iron: currentMinerals.iron + rewards.iron,
        gold: currentMinerals.gold + rewards.gold,
        emerald: currentMinerals.emerald + rewards.emerald,
        diamond: currentMinerals.diamond + rewards.diamond,
        ruby: currentMinerals.ruby + rewards.ruby,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", req.user.id)

    if (updateError) {
      console.error(updateError)
      return res.status(500).json({ error: "failed_to_update_minerals" })
    }
  } else {
    const { error: insertError } = await supabase
      .from("user_minerals")
      .insert({
        user_id: req.user.id,
        copper: rewards.copper,
        iron: rewards.iron,
        gold: rewards.gold,
        emerald: rewards.emerald,
        diamond: rewards.diamond,
        ruby: rewards.ruby,
      })

    if (insertError) {
      console.error(insertError)
      return res.status(500).json({ error: "failed_to_create_minerals" })
    }
  }

  const { error: transactionError } = await supabase
    .from("mineral_transactions")
    .insert({
      user_id: req.user.id,
      transaction_type: "chest_opened",
      minerals_changed: rewards,
      description: "daily_chest",
    })

  if (transactionError) {
    console.error(transactionError)
  }

  const { error: chestError } = await supabase
    .from("user_chests")
    .insert({
      user_id: req.user.id,
      chest_type: "daily",
      rewards,
    })

  if (chestError) {
    console.error(chestError)
    return res.status(500).json({ error: "failed_to_register_chest" })
  }

  return res.json({ success: true, rewards })
}
