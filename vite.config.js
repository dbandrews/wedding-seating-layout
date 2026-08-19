import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/wedding-seating-layout/
export default defineConfig({
  plugins: [react()],
  base: "/wedding-seating-layout/",
});
