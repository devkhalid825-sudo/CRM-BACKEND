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

export const COUNTRIES = [
  { code: 'PK', name: 'Pakistan', population: 240000000 },
  { code: 'US', name: 'United States', population: 335000000 },
  { code: 'AE', name: 'United Arab Emirates', population: 9500000 },
  { code: 'GB', name: 'United Kingdom', population: 67000000 },
  { code: 'SA', name: 'Saudi Arabia', population: 36000000 },
  { code: 'CA', name: 'Canada', population: 39000000 },
  { code: 'AU', name: 'Australia', population: 26000000 },
];

export const CITIES = [
  // Pakistan
  { countryCode: 'PK', name: 'Karachi', lat: 24.8607, lng: 67.0011, population: 16000000 },
  { countryCode: 'PK', name: 'Lahore', lat: 31.5204, lng: 74.3587, population: 13000000 },
  { countryCode: 'PK', name: 'Islamabad', lat: 33.6844, lng: 73.0479, population: 1200000 },
  { countryCode: 'PK', name: 'Rawalpindi', lat: 33.5651, lng: 73.0169, population: 2100000 },
  { countryCode: 'PK', name: 'Faisalabad', lat: 31.4504, lng: 73.1350, population: 3200000 },
  { countryCode: 'PK', name: 'Multan', lat: 30.1575, lng: 71.5249, population: 1900000 },
  { countryCode: 'PK', name: 'Peshawar', lat: 34.0151, lng: 71.5249, population: 2000000 },

  // UAE
  { countryCode: 'AE', name: 'Dubai', lat: 25.2048, lng: 55.2708, population: 3500000 },
  { countryCode: 'AE', name: 'Abu Dhabi', lat: 24.4539, lng: 54.3773, population: 1500000 },
  { countryCode: 'AE', name: 'Sharjah', lat: 25.3463, lng: 55.4209, population: 1800000 },

  // US
  { countryCode: 'US', name: 'New York', lat: 40.7128, lng: -74.0060, population: 8300000 },
  { countryCode: 'US', name: 'Los Angeles', lat: 34.0522, lng: -118.2437, population: 3900000 },
  { countryCode: 'US', name: 'Chicago', lat: 41.8781, lng: -87.6298, population: 2700000 },
  { countryCode: 'US', name: 'Houston', lat: 29.7604, lng: -95.3698, population: 2300000 },
  { countryCode: 'US', name: 'Miami', lat: 25.7617, lng: -80.1918, population: 450000 },

  // UK
  { countryCode: 'GB', name: 'London', lat: 51.5074, lng: -0.1278, population: 8900000 },
  { countryCode: 'GB', name: 'Manchester', lat: 53.4808, lng: -2.2426, population: 550000 },
  { countryCode: 'GB', name: 'Birmingham', lat: 52.4862, lng: -1.8904, population: 1150000 },

  // Saudi Arabia
  { countryCode: 'SA', name: 'Riyadh', lat: 24.7136, lng: 46.6753, population: 7600000 },
  { countryCode: 'SA', name: 'Jeddah', lat: 21.4858, lng: 39.1925, population: 4700000 },
];

export async function seedGeo() {
  console.log('Seeding countries & metropolitan cities into SQL Database...');

  for (const c of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: c.code },
      update: { name: c.name, population: c.population },
      create: c,
    });
  }

  for (const city of CITIES) {
    const existing = await prisma.city.findFirst({
      where: { countryCode: city.countryCode, name: city.name },
    });
    if (!existing) {
      await prisma.city.create({ data: city });
    }
  }

  console.log(`✅ Seeded ${COUNTRIES.length} countries and ${CITIES.length} major cities.`);
}

if (process.argv[1] && process.argv[1].endsWith('seed-geo.ts')) {
  seedGeo()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to seed geo:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
