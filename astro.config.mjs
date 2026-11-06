// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// Fully static output: notcanva has no backend; designs live in the user's IndexedDB.
export default defineConfig({
  site: "https://notcanva.com",
  output: "static",
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  server: { host: true, port: 4321 },
  devToolbar: { enabled: false },
});
