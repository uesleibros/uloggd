export async function sendDiscordNotification(type, data) {
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
  if (!WEBHOOK_URL) return

  const BASE_URL = process.env.APP_URL

  const payloads = {
    verification_request: {
      embeds: [
        {
          title: "🔔 Nova solicitação de verificação",
          color: 0x7c3aed,
          description: `**Usuário:** [${data.username || "Desconhecido"}](${BASE_URL}/u/${data.username})\n**ID:** \`${data.userId}\`\n\n**Motivo:**\n${data.reason || "Não informado"}`,
          timestamp: new Date().toISOString(),
          footer: { text: "uloggd" }
        }
      ]
    }
  }

  const payload = payloads[type]
  if (!payload) return

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  } catch (e) {
    console.error(e)
  }
}
