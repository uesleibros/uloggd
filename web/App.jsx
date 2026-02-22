import { Routes, Route } from "react-router-dom"
import RouteLoader from "@components/Layout/RouteLoader"
import ScrollToTop from "@components/Layout/ScrollToTop"
import Header from "@components/Layout/Header"
import Footer from "@components/Layout/Footer"
import TwemojiProvider from "@components/UI/Twemoji"
import { MyLibraryProvider } from "#hooks/useMyLibrary"
import { useHeartbeat } from "#hooks/useHeartbeat"
import ErrorBoundary from "@components/ErrorBoundary"
import Home from "@pages/Home"
import Game from "@pages/Game"
import Profile from "@pages/Profile"
import ListPage from "@pages/ListPage"
import NotificationContainer from "@components/UI/Notification"
import NotFound from "@pages/NotFound"
import SplashScreen from "@components/UI/SplashScreen"

import "#web/App.css"

export default function App() {
	useHeartbeat()

	return (
		<ErrorBoundary>
			<SplashScreen>
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
								<Route path="*" element={<NotFound />} />
							</Routes>
						</ErrorBoundary>
					</main>

					<Footer />
				</MyLibraryProvider>
			</SplashScreen>
		</ErrorBoundary>
	)
}

