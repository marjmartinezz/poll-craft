import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
    // DIRECT_URL is used by migration commands to bypass pgBouncer
    // Set it in your env — Prisma CLI will pick it up via directUrl if needed
  },
});
