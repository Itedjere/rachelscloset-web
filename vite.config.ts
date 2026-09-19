import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // 5174, because BizyFarmers holds 5173 on this machine.
    port: 5174,
    proxy: {
      // Dev only: keeps the browser on one origin so there is no CORS setup
      // while building, and -- the reason it matters here -- a service worker
      // registered on the same origin as the API it talks to.
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
