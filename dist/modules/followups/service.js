import { prisma } from '../../db/prisma.js';
import { logger } from '../../services/logger.js';
export class FollowupService {
    /**
     * Seed standard sales follow-up rules if none exist
     */
    async ensureDefaultRules() {
        const count = await prisma.followupRule.count();
        if (count > 0)
            return;
        const defaultRules = [
            {
                name: '3-Day Cold Lead Re-engagement',
                triggerOn: 'no_contact_days',
                conditionJson: { status: 'new', days: 3 },
                delayHours: 72,
                active: true,
            },
            {
                name: 'Post-Contact Nudge (48 Hours)',
                triggerOn: 'status_change',
                conditionJson: { status: 'contacted', days: 2 },
                delayHours: 48,
                active: true,
            },
            {
                name: 'Unclosed Meeting Follow-up',
                triggerOn: 'status_change',
                conditionJson: { status: 'meeting', days: 4 },
                delayHours: 96,
                active: true,
            },
        ];
        for (const r of defaultRules) {
            await prisma.followupRule.create({ data: r });
        }
        logger.info('followups', `Seeded ${defaultRules.length} default commercial follow-up rules.`);
    }
    /**
     * List follow-up rules
     */
    async listRules() {
        await this.ensureDefaultRules();
        return prisma.followupRule.findMany({
            orderBy: { createdAt: 'asc' },
        });
    }
    /**
     * Create a new follow-up rule
     */
    async createRule(input) {
        return prisma.followupRule.create({
            data: {
                name: input.name,
                triggerOn: input.triggerOn,
                conditionJson: input.conditionJson,
                templateId: input.templateId,
                delayHours: input.delayHours,
                active: true,
            },
        });
    }
    /**
     * Toggle a rule's active state
     */
    async toggleRule(ruleId) {
        const rule = await prisma.followupRule.findUnique({ where: { id: ruleId } });
        if (!rule)
            throw new Error('Follow-up rule not found');
        return prisma.followupRule.update({
            where: { id: ruleId },
            data: { active: !rule.active },
        });
    }
    /**
     * List follow-up tasks
     */
    async listTasks(status) {
        const where = {};
        if (status)
            where.status = status;
        return prisma.followupTask.findMany({
            where,
            orderBy: { scheduledFor: 'asc' },
            take: 50,
        });
    }
    /**
     * Execute follow-up check scan across all leads
     */
    async runFollowupCheck() {
        const rules = await prisma.followupRule.findMany({ where: { active: true } });
        if (rules.length === 0)
            return { scheduledCount: 0, evaluatedCount: 0 };
        let scheduledCount = 0;
        let evaluatedCount = 0;
        for (const rule of rules) {
            const cond = rule.conditionJson;
            const targetStatus = cond?.status || 'new';
            const days = cond?.days || 2;
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const eligibleLeads = await prisma.lead.findMany({
                where: {
                    status: targetStatus,
                    archivedAt: null,
                    updatedAt: { lte: cutoff },
                },
                take: 25,
            });
            evaluatedCount += eligibleLeads.length;
            for (const lead of eligibleLeads) {
                // Check if task already exists
                const existing = await prisma.followupTask.findFirst({
                    where: { ruleId: rule.id, leadId: lead.id, status: 'pending' },
                });
                if (!existing) {
                    await prisma.followupTask.create({
                        data: {
                            ruleId: rule.id,
                            leadId: lead.id,
                            scheduledFor: new Date(),
                            status: 'pending',
                        },
                    });
                    // Log follow-up event on lead timeline
                    await prisma.leadEvent.create({
                        data: {
                            leadId: lead.id,
                            type: 'system',
                            payload: {
                                action: 'followup_scheduled',
                                ruleName: rule.name,
                                message: `Automated follow-up triggered: ${rule.name}`,
                            },
                        },
                    });
                    scheduledCount++;
                }
            }
        }
        logger.info('followups', `Completed follow-up scan: ${scheduledCount} tasks scheduled, ${evaluatedCount} leads evaluated.`);
        return { scheduledCount, evaluatedCount };
    }
}
export const followupService = new FollowupService();
//# sourceMappingURL=service.js.map