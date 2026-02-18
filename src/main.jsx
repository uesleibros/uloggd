import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { showConsoleWarning } from "../utils/consoleWarning"

import App from "./App"
import "./index.css"
import "./styles/avatar.css"

showConsoleWarning()

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

