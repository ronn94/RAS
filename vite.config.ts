import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
    // /api는 별도로 띄운 wrangler dev(Worker + D1 + R2)로 넘긴다.
    // `npm run dev:api`를 따로 켜두면 프런트는 HMR을 그대로 쓰면서 실제 백엔드에 붙는다.
    proxy: { "/api": "http://localhost:8788" },
  },
});
