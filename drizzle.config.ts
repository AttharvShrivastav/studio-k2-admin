import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const configEnv = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
}).parse(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: configEnv.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
