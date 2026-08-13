import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works from a subfolder or a plain file
  // server on the LAN, which is how a Kindle will usually reach it.
  base: "./",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Kindle's stock browser is an older WebKit. Downlevel so it can parse.
    target: "es2015",
    outDir: "dist",
    assetsInlineLimit: 8192,
  },
});
