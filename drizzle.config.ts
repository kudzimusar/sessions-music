import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: ["./db/schema.ts", "./db/corporate-schema.ts"],
  dialect: "sqlite",
});
