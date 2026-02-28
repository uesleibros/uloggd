import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { LanguageProvider } from "#lib/i18n"
import { showConsoleWarning } from "#utils/consoleWarning"

import App from "#web/App"
import "#web/index.css"
import "@styles/avatar.css"

showConsoleWarning()

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>
)