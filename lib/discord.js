export async function sendDiscordNotification(type, data) {
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL
  if (!WEBHOOK_URL) return

  const BASE_URL = process.env.APP_URL

  const payloads = {
    verification_request: {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 0x7c3aed,
          components: [
            {
              type: 10,
              content: "## 🔔 Nova solicitação de verificação"
            },
            {
              type: 14,
              divider: true
            },
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: `**Usuário**\n${data.username || "Desconhecido"}`
                },
                {
                  type: 10,
                  content: `**User ID**\n\`${data.userId}\``
                }
              ]
            },
            {
              type: 10,
              content: `**Motivo**\n${data.reason || "Não informado"}`
            },
            {
              type: 14,
              divider: true
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "Ver perfil",
                  url: `${BASE_URL}/u/${data.username}`
                }
              ]
            }
          ]
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
    console.error("Discord webhook error:", e)
  }
}
