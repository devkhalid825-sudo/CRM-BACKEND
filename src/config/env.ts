import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Intelligent .env file locator:
 * Checks process.cwd(), directory hierarchy, and fallback monorepo root.
 */
function loadEnvironment(): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),       // from src/config or dist/config (project root)
    path.resolve(__dirname, '../.env'),          // direct parent
    path.resolve(__dirname, '../../../../.env'), // monorepo root (if nested)
  ];

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return envPath;
    }
  }

  // Fallback to default dotenv lookup
  dotenv.config();
  return null;
}

// Load environment variables immediately on module import
loadEnvironment();

/**
 * Zod Schema for backend configuration
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z
    .string()
    .trim()
    .default('mongodb://127.0.0.1:27017/global_crm'),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .default('f349bf1025344af7b72d232bc3177d50521d439c5286ac2a30f95e33c3438464'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters')
    .default('1ed5759d30a50e51595a9cb215c2ff2f497f4e1a58b21211289b640b421a9724'),
  ENCRYPTION_MASTER_KEY: z
    .string()
    .default('oAjvraaY7AGLquKe3n029/KZ0eMcY/0zaf31FYiPO78=')
    .refine(
      (key) => {
        try {
          const buf = Buffer.from(key, 'base64');
          return buf.length === 32;
        } catch {
          return false;
        }
      },
      { message: 'ENCRYPTION_MASTER_KEY must be a valid 32-byte Base64-encoded string' }
    ),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:4000'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Validates process.env with clear, actionable warnings instead of unhelpful crashes.
 */
function parseAndValidateEnv(): EnvConfig {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ [Config Error] Environment validation failed:');
    const formatted = parsed.error.format();
    for (const [key, value] of Object.entries(formatted)) {
      if (
        key !== '_errors' &&
        value &&
        typeof value === 'object' &&
        '_errors' in value &&
        Array.isArray((value as any)._errors) &&
        (value as any)._errors.length > 0
      ) {
        console.error(`   - ${key}: ${(value as any)._errors.join(', ')}`);
      }
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Exiting process due to critical configuration errors in production.');
      process.exit(1);
    }
  }

  const data = parsed.success ? parsed.data : EnvSchema.parse({});

  // Helpful warnings when critical variables fall back to defaults
  if (!process.env.MONGODB_URI) {
    console.warn(`⚠️  [Config Warning]: MONGODB_URI is not set in environment or .env. Using fallback: ${data.MONGODB_URI}`);
  }
  if (!process.env.JWT_ACCESS_SECRET && data.NODE_ENV === 'production') {
    console.warn('⚠️  [Security Warning]: Running in production with default JWT_ACCESS_SECRET. Please set a secure random string.');
  }
  if (!process.env.ENCRYPTION_MASTER_KEY && data.NODE_ENV === 'production') {
    console.warn('⚠️  [Security Warning]: Running in production with default ENCRYPTION_MASTER_KEY.');
  }

  return data;
}

export const env = parseAndValidateEnv();
