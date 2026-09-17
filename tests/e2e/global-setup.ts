import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const E2E_DATABASE_URL = "file:./e2e.db";

/**
 * Starts every Playwright run from a clean, migrated SQLite database.
 * Prisma resolves a relative SQLite path against the schema directory, so the
 * file lives in `prisma/`, not in the current working directory.
 */
export default function globalSetup() {
  const dbPath = path.resolve(process.cwd(), "prisma", "e2e.db");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${dbPath}${suffix}`;
    if (existsSync(file)) unlinkSync(file);
  }

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });
}
