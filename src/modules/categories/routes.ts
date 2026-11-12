import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { DEFAULT_CATEGORIES } from './defaults.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    // 1. Ensure all default categories are upserted into the database
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.category.upsert({
        where: { name: cat.name },
        update: { keywords: cat.keywords, active: true },
        create: {
          name: cat.name,
          keywords: cat.keywords,
          active: true,
        },
      });
    }

    // 2. Only deactivate explicitly known legacy old categories (never deactivate user custom categories)
    const legacyOldCategories = [
      'Car Dealerships & Auto Repair',
      'Gyms & Fitness Studios',
      'Plumbers & HVAC Services',
      'Lawyers & Legal Firms',
    ];
    await prisma.category.updateMany({
      where: {
        name: { in: legacyOldCategories },
      },
      data: { active: false },
    });

    const list = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, keywords } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Format keywords flexibly: can be array of strings, comma-separated string, or terms array
    let formattedKeywords = keywords;
    if (typeof keywords === 'string') {
      const terms = keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
      formattedKeywords = [{ lang: 'en', terms: terms.length > 0 ? terms : [trimmedName] }];
    } else if (Array.isArray(keywords) && keywords.length > 0 && typeof keywords[0] === 'string') {
      formattedKeywords = [{ lang: 'en', terms: keywords }];
    } else if (!formattedKeywords || (Array.isArray(formattedKeywords) && formattedKeywords.length === 0)) {
      formattedKeywords = [{ lang: 'en', terms: [trimmedName] }];
    }

    const cat = await prisma.category.upsert({
      where: { name: trimmedName },
      update: { keywords: formattedKeywords, active: true },
      create: {
        name: trimmedName,
        keywords: formattedKeywords,
        active: true,
      },
    });

    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
});

export const categoryRoutes = router;
