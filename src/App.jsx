import { Routes, Route } from "react-router-dom"
import RouteLoader from "./components/RouteLoader"
import ScrollToTop from "./components/ScrollToTop"
import Header from "./components/Header"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Game from "./pages/Game"
import Profile from "./pages/Profile"
import NotificationContainer from "./components/Notification"
import NotFound from "./pages/NotFound"

import "./App.css"

export default function App() {
  return (
    <>
      <ScrollToTop />
      <RouteLoader />
      <NotificationContainer />
      <Header />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:slug" element={<Game />} />
          <Route path="/u/:username" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </>
  )
}
