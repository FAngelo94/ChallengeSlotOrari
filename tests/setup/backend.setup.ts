import path from "node:path";
import { config } from "dotenv";
import { afterAll, afterEach } from "vitest";

// Must run before any module imports the Prisma client singleton, so the
// backend test suite always talks to the dedicated test SQLite database.
config({ path: path.resolve(process.cwd(), ".env.test") });

const { prisma } = await import("@/lib/prisma");
const { __resetLocksForTests } = await import("@/lib/locks");

afterEach(async () => {
  await prisma.booking.deleteMany();
  __resetLocksForTests();
});

afterAll(async () => {
  await prisma.$disconnect();
});
