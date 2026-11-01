import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { DEFAULT_COUNTRIES, DEFAULT_CITIES } from './defaults.js';

const router = Router();

router.get('/countries', async (req, res, next) => {
  try {
    let list = await prisma.country.findMany({ orderBy: { name: 'asc' } });

    // Self-healing: auto-seed if table is empty
    if (list.length === 0) {
      for (const c of DEFAULT_COUNTRIES) {
        await prisma.country.upsert({
          where: { code: c.code },
          update: { name: c.name, population: c.population },
          create: c,
        });
      }
      list = await prisma.country.findMany({ orderBy: { name: 'asc' } });
    }

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.get('/cities', async (req, res, next) => {
  try {
    const country = (req.query.country as string || '').toUpperCase();
    const where = country ? { countryCode: country } : {};
    let list = await prisma.city.findMany({
      where,
      orderBy: { population: 'desc' },
      take: 100,
    });

    // Self-healing: auto-seed cities if empty
    if (list.length === 0) {
      const candidates = country
        ? DEFAULT_CITIES.filter((c) => c.countryCode.toUpperCase() === country)
        : DEFAULT_CITIES;

      for (const city of candidates) {
        const existing = await prisma.city.findFirst({
          where: { countryCode: city.countryCode, name: city.name },
        });
        if (!existing) {
          await prisma.city.create({ data: city });
        }
      }

      list = await prisma.city.findMany({
        where,
        orderBy: { population: 'desc' },
        take: 100,
      });
    }

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

export const geoRoutes = router;
