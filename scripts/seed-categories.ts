import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../src/db/prisma.js';

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

export const DEFAULT_CATEGORIES = [
  {
    name: 'Restaurants & Cafes',
    keywords: [
      { lang: 'en', terms: ['restaurant', 'cafe', 'coffee shop', 'bakery', 'fast food', 'pizzeria'] },
      { lang: 'ur', terms: ['hotel', 'dhabba', 'restaurant', 'mithai'] },
      { lang: 'ar', terms: ['مطعم', 'مقهى'] },
    ],
  },
  {
    name: 'Real Estate & Property',
    keywords: [
      { lang: 'en', terms: ['real estate agency', 'property consultant', 'realtor', 'property management'] },
      { lang: 'ur', terms: ['property dealer', 'estate agent'] },
      { lang: 'ar', terms: ['عقارات', 'وسيط عقاري'] },
    ],
  },
  {
    name: 'Digital Agencies & IT Services',
    keywords: [
      { lang: 'en', terms: ['software company', 'digital marketing agency', 'web design agency', 'SEO service'] },
      { lang: 'ur', terms: ['software house', 'it services'] },
    ],
  },
  {
    name: 'Dental & Medical Clinics',
    keywords: [
      { lang: 'en', terms: ['dental clinic', 'dentist', 'aesthetic clinic', 'medical center', 'hospital'] },
      { lang: 'ur', terms: ['dental clinic', 'hospital', 'doctor'] },
    ],
  },
  {
    name: 'Gyms & Fitness Studios',
    keywords: [
      { lang: 'en', terms: ['gym', 'fitness club', 'crossfit', 'yoga studio', 'personal trainer'] },
    ],
  },
  {
    name: 'Car Dealerships & Auto Repair',
    keywords: [
      { lang: 'en', terms: ['car showroom', 'auto repair', 'car detailing', 'car rental'] },
    ],
  },
  {
    name: 'Lawyers & Legal Firms',
    keywords: [
      { lang: 'en', terms: ['law firm', 'corporate lawyer', 'attorney', 'legal advisor'] },
    ],
  },
];

export async function seedCategories() {
  console.log('Seeding categories into SQL Database...');
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: { keywords: cat.keywords },
      create: {
        name: cat.name,
        keywords: cat.keywords,
        active: true,
      },
    });
  }
  console.log(`✅ Seeded ${DEFAULT_CATEGORIES.length} default business categories.`);
}

if (process.argv[1] && process.argv[1].endsWith('seed-categories.ts')) {
  seedCategories()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to seed categories:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
