import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { showConsoleWarning } from "#utils/consoleWarning"

import App from "#web/App"
import "#web/index.css"
import "#web/styles/avatar.css"

showConsoleWarning()

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

