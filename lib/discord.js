export async function sendDiscordNotification(type, data) {
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
  if (!WEBHOOK_URL) return

  const BASE_URL = process.env.APP_URL

  const embeds = {
    verification_request: {
      title: "Nova solicitação de verificação",
      color: 0x7c3aed,
      fields: [
        { 
          name: "Usuário", 
          value: data.username 
            ? `[${data.username}](${BASE_URL}/@${data.username})` 
            : "Desconhecido", 
          inline: true 
        },
        { name: "User ID", value: `\`${data.userId}\``, inline: true },
        { name: "Motivo", value: data.reason || "Não informado" }
      ],
      footer: { text: "uloggd" },
      timestamp: new Date().toISOString()
    }
  }

  const embed = embeds[type]
  if (!embed) return

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] })
    })
  } catch (e) {
    console.error("Discord webhook error:", e)
  }
}
