import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Only needed for `drizzle-kit migrate`; `generate` works offline.
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder',
  },
});
