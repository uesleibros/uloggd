import { Routes, Route, Navigate } from "react-router-dom"
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
import Minerals from "@pages/Minerals"
import SearchPage from "@pages/SearchPage"
import Game from "@pages/Game"
import Profile from "@pages/Profile"
import ListPage from "@pages/ListPage"
import ShopPage from "@pages/Shop"
import LeaderboardPage from "@pages/LeaderboardPage"
import ReviewPage from "@pages/ReviewPage"
import ScreenshotPage from "@pages/ScreenshotPage"
import TierlistPage from "@pages/TierlistPage"
import LegalPage from "@pages/Legal"
import BlogPage from "@pages/Blog"
import NotificationContainer from "@components/UI/Notification"
import NotFound from "@pages/NotFound"
import SplashScreen from "@components/UI/SplashScreen"
import BannedScreen from "@components/BannedScreen"

import "#web/App.css"

export default function App() {
	const { banned } = useAuth()
	useHeartbeat()

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
				<SplashScreen />
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
							<Route path="/tierlist/:id" element={<TierlistPage />} />
							<Route path="/review/:id" element={<ReviewPage />} />
							<Route path="/screenshot/:id" element={<ScreenshotPage />} />
							<Route path="/u/:username" element={<Profile />} />
							<Route path="/about/badges" element={<Badges />} />
							<Route path="/about/minerals" element={<Minerals />} />
							<Route path="/search" element={<SearchPage />} />
							<Route path="/shop" element={<ShopPage />} />
							<Route path="/leaderboard" element={<LeaderboardPage />} />
							<Route path="/blog" element={<BlogPage />} />
							<Route path="/legal/:type" element={<LegalPage />} />
							<Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
							<Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
							<Route path="*" element={<NotFound />} />
						</Routes>
					</ErrorBoundary>
				</main>

				<Footer />
			</MyLibraryProvider>
		</ErrorBoundary>
	)
}
