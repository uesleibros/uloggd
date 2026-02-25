import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(), 
		tailwindcss(),
	],
	server: {
		host: "0.0.0.0",
		port: 3000,
		watch: {
			ignored: ["**/node_modules/**", "**/dist/**"],
		},
	},
	resolve: {
		alias: {
			"#constants": "/constants",
			"#utils": "/utils",
			"#web": "/web",
			"#hooks": "/hooks",
			"#services": "/services",
			"#lib": "/lib",
			"#data": "/data",
			"#api": "/api",
			"#routers": "/routers",
			"#models": "/models",
			"@styles": "/web/styles",
			"@pages": "/web/pages",
			"@components": "/web/components"
		}
	}
})
