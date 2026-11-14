import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "next/server": path.resolve(
        import.meta.dirname,
        "node_modules/next/server.js"
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
  },
});
