export function showConsoleWarning() {
  const styles = {
    title: [
      "color: #ff3333",
      "font-size: 42px",
      "font-weight: bold",
    ].join(";"),

    warning: [
      "color: #ff6b6b",
      "font-size: 16px",
      "font-weight: bold",
      "line-height: 1.8",
    ].join(";"),

    info: [
      "color: #888888",
      "font-size: 14px",
      "line-height: 1.6",
    ].join(";"),
  }

  console.log("%cAtenção!", styles.title)

  console.log(
    "%cEste é um recurso destinado a desenvolvedores. Se alguém pediu para você copiar e colar algo aqui, não faça — isso é golpe.",
    styles.warning
  )

  console.log(
    "%cInserir código desconhecido neste console pode comprometer sua conta e expor seus dados pessoais.",
    styles.warning
  )

  console.log(
    "%cSe você é desenvolvedor e quer contribuir com o projeto → https://github.com/uesleibros/uloggd",
    styles.info
  )
}