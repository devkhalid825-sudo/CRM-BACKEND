import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { DEFAULT_CATEGORIES } from './defaults.js';
const router = Router();
router.get('/', async (req, res, next) => {
    try {
        let list = await prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
        // Self-healing: auto-seed categories if table is empty
        if (list.length === 0) {
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
            list = await prisma.category.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
        }
        res.json({ success: true, data: list });
    }
    catch (err) {
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
    }
    catch (err) {
        next(err);
    }
});
export const categoryRoutes = router;
//# sourceMappingURL=routes.js.map