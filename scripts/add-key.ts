import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Intelligent .env loading
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

async function main() {
  const providerId = (process.argv[2] || '').toLowerCase().trim();
  const apiKey = (process.argv[3] || '').trim();
  const label = process.argv[4] || `Production ${providerId} Key`;
  const dailyCap = parseInt(process.argv[5] || '0', 10);
  const priority = parseInt(process.argv[6] || '1', 10);

  if (!providerId || !apiKey) {
    console.log(`\nUsage: npm run add-key <providerId> <apiKey> [label] [dailyCap] [priority]`);
    console.log(`Example: npm run add-key serpapi b51ca83c... "My SerpAPI Key"`);
    console.log(`Supported Providers: serpapi, gemini, google_places, apify, overpass\n`);
    process.exit(1);
  }

  console.log(`\n==========================================================`);
  console.log(`   GLOBAL LEAD CRM - PROVIDER KEY REGISTRATION            `);
  console.log(`==========================================================`);
  console.log(`Provider:     ${providerId}`);
  console.log(`Label:        ${label}`);
  console.log(`Key:          ${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`);

  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.$connect();

  const encryptedKey = encrypt(apiKey);

  // Check if a key with same label already exists for this provider
  const existing = await prisma.providerKey.findFirst({
    where: { providerId, label },
  });

  if (existing) {
    await prisma.providerKey.update({
      where: { id: existing.id },
      data: {
        encryptedKey,
        enabled: true,
        status: 'healthy',
        priority,
        dailyCap,
        lastError: null,
        cooldownUntil: null,
      },
    });
    console.log(`✅ [SQL / Prisma] Updated existing key [${label}] for provider [${providerId}]!`);
  } else {
    const created = await prisma.providerKey.create({
      data: {
        providerId,
        label,
        encryptedKey,
        priority,
        dailyCap,
        enabled: true,
        status: 'healthy',
        usageToday: 0,
        usageResetAt: new Date(),
      },
    });
    console.log(`✅ [SQL / Prisma] Successfully registered new key [${label}] (ID: ${created.id})!`);
  }

  // Ensure the provider is enabled
  await prisma.provider.upsert({
    where: { providerId },
    update: { enabled: true },
    create: {
      kind: providerId === 'gemini' ? 'ai' : 'places',
      providerId,
      name: providerId.replace('_', ' ').toUpperCase(),
      enabled: true,
      chainOrder: providerId === 'serpapi' ? 1 : 2,
    },
  });

  console.log(`✅ Provider [${providerId}] marked active & enabled in Failover pool.`);
  console.log(`==========================================================\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Failed to register provider key:', err);
  process.exit(1);
});
