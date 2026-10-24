import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from monorepo root or current directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const BootstrapEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_MASTER_KEY: z.string().refine(
    (key) => {
      try {
        const buf = Buffer.from(key, 'base64');
        return buf.length === 32;
      } catch {
        return false;
      }
    },
    { message: 'ENCRYPTION_MASTER_KEY must be a 32-byte Base64 encoded string' }
  ),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
});

const parsed = BootstrapEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ FATAL: Bootstrap configuration validation failed:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
