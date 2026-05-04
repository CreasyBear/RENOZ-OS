import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import arraybuffer from "vite-plugin-arraybuffer";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [arraybuffer(), react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
      drizzle: fileURLToPath(new URL("./drizzle", import.meta.url)),
    },
  },
  logLevel: "error",
});
