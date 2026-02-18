import { Routes, Route } from "react-router-dom"
import RouteLoader from "./components/Layout/RouteLoader"
import ScrollToTop from "./components/Layout/ScrollToTop"
import Header from "./components/Layout/Header"
import Footer from "./components/Layout/Footer"
import TwemojiProvider from "./components/UI/Twemoji"
import { UserGamesProvider } from "../hooks/useUserGames"
import Home from "./pages/Home"
import Game from "./pages/Game"
import Profile from "./pages/Profile"
import NotificationContainer from "./components/UI/Notification"
import NotFound from "./pages/NotFound"

import "./App.css"

export default function App() {
	return (
		<>
			<ScrollToTop />
			<RouteLoader />
			<NotificationContainer />
			<TwemojiProvider />
			<Header />

			<UserGamesProvider>
				<main className="main-content">
					<Routes>
						<Route path="/" element={<Home />} />
						<Route path="/game/:slug" element={<Game />} />
						<Route path="/u/:username" element={<Profile />} />
						<Route path="*" element={<NotFound />} />
					</Routes>
				</main>
			</UserGamesProvider>
			
			<Footer />
		</>
	)
}
