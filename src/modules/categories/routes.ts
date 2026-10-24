import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const list = await prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, keywords } = req.body;
    const cat = await prisma.category.create({
      data: { name, keywords: keywords || [] },
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
});

export const categoryRoutes = router;
