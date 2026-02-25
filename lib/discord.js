export async function sendDiscordNotification(type, data) {
  const baseWebhook = process.env.DISCORD_WEBHOOK_URL
  if (!baseWebhook) return

  const WEBHOOK_URL = `${baseWebhook}?with_components=true`
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
              content: "### Nova solicitação de verificação"
            },
            { type: 14 },
            {
              type: 10,
              content:
                `**Usuário:** [${data.username || "Desconhecido"}](${BASE_URL}/u/${data.username})\n` +
                `**ID:** \`${data.userId}\``
            },
            { type: 14 },
            {
              type: 10,
              content: `**Motivo:**\n${data.reason || "Não informado"}`
            },
            { type: 14 },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "Abrir Perfil",
                  url: `${BASE_URL}/u/${data.username}`
                }
              ]
            }
          ]
        }
      ]
    },

    user_banned: {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 0xed4245,
          components: [
            {
              type: 10,
              content: "### Usuário banido"
            },
            { type: 14 },
            {
              type: 10,
              content:
                `**Usuário:** [${data.username}](${BASE_URL}/u/${data.username})\n` +
                `**Banido por:** ${data.moderatorUsername}`
            },
            { type: 14 },
            {
              type: 10,
              content: `**Motivo:**\n${data.reason}`
            },
            { type: 14 },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "Ver Perfil",
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
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const text = await res.text()
      console.error("Discord webhook error:", text)
    }
  } catch (e) {
    console.error(e)
  }
}