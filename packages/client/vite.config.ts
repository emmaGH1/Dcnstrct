import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, "../../public"),
  resolve: {
    alias: {
      "@dcnstrct/shared": path.resolve(__dirname, "../shared/src/index.ts"),
      "@dcnstrct/contracts": path.resolve(__dirname, "../shared/src/contracts.ts"),
      "@dcnstrct/ui-contracts": path.resolve(__dirname, "../shared/src/ui-contracts.ts"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
