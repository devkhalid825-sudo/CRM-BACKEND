import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

const router = Router();

router.get('/countries', async (req, res, next) => {
  try {
    const list = await prisma.country.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.get('/cities', async (req, res, next) => {
  try {
    const country = req.query.country as string;
    const where = country ? { countryCode: country.toUpperCase() } : {};
    const list = await prisma.city.findMany({
      where,
      orderBy: { population: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

export const geoRoutes = router;
