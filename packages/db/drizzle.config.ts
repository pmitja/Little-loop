import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

// pnpm --filter runs this config with packages/db as the working directory,
// while the shared development environment lives at the repository root.
// CI/deployment-provided variables still take precedence.
const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url));
if (!process.env.DATABASE_URL && existsSync(rootEnv)) loadEnvFile(rootEnv);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to the root .env or export it before migrating.');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
