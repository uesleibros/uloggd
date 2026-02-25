export async function sendDiscordNotification(type, data) {
  const WEBHOOK_URL = `${process.env.DISCORD_WEBHOOK_URL}?with_components=true`
  if (!WEBHOOK_URL) return

  const BASE_URL = process.env.APP_URL

  const payloads = {
    verification_request: {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: null,
          components: [
            {
              type: 10,
              content: `### Nova solicitação de verificação\n\n**Usuário:** [${data.username || "Desconhecido"}](${BASE_URL}/u/${data.username})\n**ID:** \`${data.userId}\`\n\n**Motivo:**\n${data.reason || "Não informado"}`
            },
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
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
  } catch (e) {
    console.error(e)
  }
}
