import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import argon2 from 'argon2';
import crypto from 'crypto';
import { authenticator } from 'otplib';

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

const DATABASE_URL = process.env.DATABASE_URL;
const MONGODB_URI = process.env.MONGODB_URI;
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

async function createAdmin() {
  const email = (process.argv[2] || 'admin@crm.local').toLowerCase().trim();
  const password = process.argv[3] || 'AdminPass123!';
  const name = process.argv[4] || 'System Administrator';

  const passwordHash = await argon2.hash(password);
  const totpSecret = authenticator.generateSecret();
  const secretEnc = encrypt(totpSecret);

  console.log(`\n==========================================================`);
  console.log(`   GLOBAL LEAD CRM - ADMIN SEED UTILITY                   `);
  console.log(`==========================================================`);

  // 1. If DATABASE_URL is present, seed into PostgreSQL (Prisma)
  if (DATABASE_URL) {
    try {
      console.log(`🔌 Connecting to SQL Database (Prisma)...`);
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$connect();

      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            passwordHash,
            role: 'admin',
            active: true,
            archivedAt: null,
            twoFactorEnabled: false, // Default to false for easy initial setup
            twoFactorSecretEnc: secretEnc,
          },
        });
        console.log(`✅ [SQL / Prisma] Administrator user [${email}] updated successfully!`);
      } else {
        await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: 'admin',
            active: true,
            twoFactorEnabled: false,
            twoFactorSecretEnc: secretEnc,
          },
        });
        console.log(`✅ [SQL / Prisma] Administrator user [${email}] created successfully!`);
      }

      await prisma.$disconnect();
    } catch (sqlErr: any) {
      console.warn(`⚠️  Prisma SQL seed warning:`, sqlErr?.message || sqlErr);
    }
  }

  // 2. If MONGODB_URI is present, also seed into MongoDB (Hybrid compatibility)
  if (MONGODB_URI) {
    try {
      console.log(`🔌 Connecting to MongoDB...`);
      const UserSchema = new mongoose.Schema(
        {
          name: String,
          email: { type: String, unique: true },
          passwordHash: String,
          role: String,
          twoFactor: { enabled: Boolean, secretEnc: String },
          active: { type: Boolean, default: true },
          archivedAt: { type: Date, default: null },
        },
        { timestamps: true }
      );
      const User = mongoose.models.User || mongoose.model('User', UserSchema);
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });

      let user = await User.findOne({ email });
      if (user) {
        user.name = name;
        user.passwordHash = passwordHash;
        user.role = 'admin';
        user.active = true;
        user.archivedAt = null;
        user.twoFactor = { enabled: false, secretEnc };
        await user.save();
        console.log(`✅ [MongoDB] Administrator user [${email}] updated successfully!`);
      } else {
        await User.create({
          name,
          email,
          passwordHash,
          role: 'admin',
          twoFactor: { enabled: false, secretEnc },
          active: true,
        });
        console.log(`✅ [MongoDB] Administrator user [${email}] created successfully!`);
      }
      await mongoose.disconnect();
    } catch (mongoErr: any) {
      console.log(`ℹ️  MongoDB seed skipped (using SQL).`);
    }
  }

  const otpauthUrl = authenticator.keyuri(email, 'Global Lead CRM', totpSecret);
  console.log('\n==========================================================');
  console.log('             ADMIN CREDENTIALS DETAILS                    ');
  console.log('==========================================================');
  console.log(`Email:        ${email}`);
  console.log(`Password:     ${password}`);
  console.log(`Role:         admin`);
  console.log(`2FA Status:   Disabled (Can be enabled from Settings)`);
  console.log(`TOTP Secret:  ${totpSecret}`);
  console.log(`TOTP URI:     ${otpauthUrl}`);
  console.log('==========================================================\n');
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to create admin user:', err);
    process.exit(1);
  });
