import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { prisma } from '../src/db/prisma.js';
import { seedGeo } from './seed-geo.js';
import { seedCategories } from './seed-categories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 'oAjvraaY7AGLquKe3n029/KZ0eMcY/0zaf31FYiPO78=';

function encrypt(text: string): string {
  const masterKey = Buffer.from(ENCRYPTION_MASTER_KEY, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function seedEnvKeys() {
  const envKeys = [
    {
      providerId: 'serper',
      key: process.env.SERPER_KEY || process.env.SERPER_API_KEY,
      label: 'Default Serper Key (.env)',
      kind: 'places',
    },
    {
      providerId: 'serpapi',
      key: process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY,
      label: 'Default SerpAPI Key (.env)',
      kind: 'places',
    },
    {
      providerId: 'gemini',
      key: process.env.GEMINI_API_KEY || process.env.GEMINI_KEY,
      label: 'Default Gemini Key (.env)',
      kind: 'ai',
    },
    {
      providerId: 'google_places',
      key: process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_KEY,
      label: 'Default Google Places Key (.env)',
      kind: 'places',
    },
    {
      providerId: 'apify',
      key: process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN,
      label: 'Default Apify Token (.env)',
      kind: 'places',
    },
  ];

  for (const item of envKeys) {
    if (!item.key) continue;

    const existing = await prisma.providerKey.findFirst({
      where: { providerId: item.providerId, label: item.label },
    });

    const encryptedKey = encrypt(item.key.trim());

    if (existing) {
      await prisma.providerKey.update({
        where: { id: existing.id },
        data: { encryptedKey, enabled: true, status: 'healthy' },
      });
      console.log(`🔑 Updated [${item.providerId}] key from environment.`);
    } else {
      await prisma.providerKey.create({
        data: {
          providerId: item.providerId,
          label: item.label,
          encryptedKey,
          priority: 1,
          dailyCap: 0,
          enabled: true,
          status: 'healthy',
        },
      });
      console.log(`🔑 Registered new [${item.providerId}] key from environment.`);
    }

    await prisma.provider.upsert({
      where: { providerId: item.providerId },
      update: { enabled: true },
      create: {
        kind: item.kind,
        providerId: item.providerId,
        name: item.providerId.replace('_', ' ').toUpperCase(),
        enabled: true,
        chainOrder: 1,
      },
    });
  }
}

async function main() {
  console.log(`\n==========================================================`);
  console.log(`   GLOBAL LEAD CRM - SYSTEM DATABASE SEEDER               `);
  console.log(`==========================================================\n`);

  try {
    await seedGeo();
    await seedCategories();
    await seedEnvKeys();
    console.log(`\n🎉 All seed data successfully loaded into SQL Database!`);
  } catch (err) {
    console.error(`❌ Seeding failed:`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
