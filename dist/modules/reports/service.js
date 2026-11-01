import { prisma } from '../../db/prisma.js';
export class ReportsService {
    /**
     * Get high-level CRM conversion and pipeline statistics
     */
    async getOverview() {
        const totalLeads = await prisma.lead.count({ where: { archivedAt: null } });
        // Group leads by status
        const statusGroups = await prisma.lead.groupBy({
            by: ['status'],
            where: { archivedAt: null },
            _count: { _all: true },
        });
        const pipeline = {
            new: 0,
            contacted: 0,
            interested: 0,
            meeting: 0,
            proposal: 0,
            won: 0,
            lost: 0,
        };
        for (const group of statusGroups) {
            pipeline[group.status] = group._count._all;
        }
        const wonCount = pipeline.won || 0;
        const conversionRate = totalLeads > 0 ? parseFloat(((wonCount / totalLeads) * 100).toFixed(1)) : 0;
        // Group leads by source
        const sourceGroups = await prisma.lead.groupBy({
            by: ['source'],
            where: { archivedAt: null },
            _count: { _all: true },
        });
        const sources = {};
        for (const group of sourceGroups) {
            sources[group.source] = group._count._all;
        }
        // Timeline actions count
        const totalCalls = await prisma.callLog.count();
        const totalNotes = await prisma.leadEvent.count({ where: { type: 'note' } });
        // Leads created in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const leadsThisWeek = await prisma.lead.count({
            where: { archivedAt: null, createdAt: { gte: sevenDaysAgo } },
        });
        return {
            totalLeads,
            pipeline,
            conversionRate,
            totalCalls,
            totalNotes,
            leadsThisWeek,
            sources,
        };
    }
    /**
     * Leads geographical distribution (Countries & Cities)
     */
    async getGeoDistribution() {
        const countryGroups = await prisma.lead.groupBy({
            by: ['country'],
            where: { archivedAt: null },
            _count: { _all: true },
            orderBy: { _count: { country: 'desc' } },
        });
        const result = [];
        for (const c of countryGroups) {
            const cityGroups = await prisma.lead.groupBy({
                by: ['city'],
                where: { archivedAt: null, country: c.country },
                _count: { _all: true },
                orderBy: { _count: { city: 'desc' } },
                take: 10,
            });
            result.push({
                country: c.country,
                count: c._count._all,
                cities: cityGroups.map((cg) => ({ city: cg.city, count: cg._count._all })),
            });
        }
        return result;
    }
    /**
     * Leads distribution by Category
     */
    async getCategoryDistribution() {
        const groups = await prisma.lead.groupBy({
            by: ['categoryName'],
            where: { archivedAt: null },
            _count: { _all: true },
            orderBy: { _count: { categoryName: 'desc' } },
            take: 15,
        });
        return groups.map((g) => ({
            category: g.categoryName || 'Uncategorized',
            count: g._count._all,
        }));
    }
    /**
     * Sales agent leaderboard & performance metrics
     */
    async getAgentPerformance() {
        const users = await prisma.user.findMany({
            where: { archivedAt: null, active: true },
            select: { id: true, name: true, email: true },
        });
        const performance = [];
        for (const u of users) {
            const leadsAssigned = await prisma.lead.count({
                where: { ownerId: u.id, archivedAt: null },
            });
            const wonCount = await prisma.lead.count({
                where: { ownerId: u.id, status: 'won', archivedAt: null },
            });
            const callsCount = await prisma.callLog.count({
                where: { userId: u.id },
            });
            performance.push({
                userId: u.id,
                name: u.name,
                email: u.email,
                leadsAssigned,
                wonCount,
                callsCount,
            });
        }
        return performance.sort((a, b) => b.leadsAssigned - a.leadsAssigned);
    }
}
export const reportsService = new ReportsService();
//# sourceMappingURL=service.js.map