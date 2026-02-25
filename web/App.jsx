import { Routes, Route } from "react-router-dom"
import RouteLoader from "@components/Layout/RouteLoader"
import ScrollToTop from "@components/Layout/ScrollToTop"
import Header from "@components/Layout/Header"
import Footer from "@components/Layout/Footer"
import TwemojiProvider from "@components/UI/Twemoji"
import { useAuth } from "#hooks/useAuth"
import { MyLibraryProvider } from "#hooks/useMyLibrary"
import { useHeartbeat } from "#hooks/useHeartbeat"
import ErrorBoundary from "@components/ErrorBoundary"
import Home from "@pages/Home"
import Badges from "@pages/Badges"
import SearchPage from "@pages/SearchPage"
import Game from "@pages/Game"
import Profile from "@pages/Profile"
import ListPage from "@pages/ListPage"
import NotificationContainer from "@components/UI/Notification"
import NotFound from "@pages/NotFound"
import SplashScreen from "@components/UI/SplashScreen"
import BannedScreen from "@components/BannedScreen"

import "#web/App.css"

export default function App() {
	const { banned, loading } = useAuth()
	useHeartbeat()

	if (loading) {
		return <SplashScreen />
	}

	if (banned) {
		return (
			<BannedScreen
				reason={banned.reason}
				expires_at={banned.expires_at}
			/>
		)
	}

	return (
		<ErrorBoundary>
			<MyLibraryProvider>
				<ScrollToTop />
				<RouteLoader />
				<NotificationContainer />
				<TwemojiProvider />
				<Header />

				<main className="main-content">
					<ErrorBoundary>
						<Routes>
							<Route path="/" element={<Home />} />
							<Route path="/game/:slug" element={<Game />} />
							<Route path="/list/:id" element={<ListPage />} />
							<Route path="/u/:username" element={<Profile />} />
							<Route path="/about/badges" element={<Badges />} />
							<Route path="/search" element={<SearchPage />} />
							<Route path="*" element={<NotFound />} />
						</Routes>
					</ErrorBoundary>
				</main>

				<Footer />
			</MyLibraryProvider>
		</ErrorBoundary>
	)
}