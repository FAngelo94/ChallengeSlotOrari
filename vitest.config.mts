import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "backend",
          environment: "node",
          include: ["tests/backend/**/*.test.ts"],
          setupFiles: ["tests/setup/backend.setup.ts"],
          fileParallelism: false,
        },
      },
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["tests/frontend/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup/vitest.setup.ts"],
        },
      },
    ],
  },
});
