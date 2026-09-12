import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: ["./db/schema.ts", "./db/corporate-schema.ts", "./db/security-schema.ts", "./db/onboarding-schema.ts", "./db/operations-schema.ts"],
  dialect: "sqlite",
});
