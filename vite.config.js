import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tailwindcss from "@tailwindcss/vite"
import { writeFileSync } from "fs"

function versionPlugin() {
  return {
    name: "version-plugin",
    buildStart() {
      const version = {
        hash: Date.now().toString(36),
        timestamp: new Date().toISOString()
      }
      writeFileSync("public/version.json", JSON.stringify(version))
    }
  }
}

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    versionPlugin()
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
      "@components": "/web/components",
      "@locales": "/web/locales"
    }
  }
})
