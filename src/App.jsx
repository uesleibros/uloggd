import { Routes, Route } from "react-router-dom"
import RouteLoader from "./components/RouteLoader"
import Header from "./components/Header"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import NotFound from "./pages/NotFound"

import "./App.css"

export default function App() {
  return (
    <>
      <RouteLoader />
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Footer />
    </>
  )
}