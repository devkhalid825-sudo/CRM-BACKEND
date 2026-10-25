import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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

async function main() {
  console.log(`\n==========================================================`);
  console.log(`   GLOBAL LEAD CRM - SYSTEM DATABASE SEEDER               `);
  console.log(`==========================================================\n`);

  try {
    await seedGeo();
    await seedCategories();
    console.log(`\n🎉 All seed data successfully loaded into SQL Database!`);
  } catch (err) {
    console.error(`❌ Seeding failed:`, err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
