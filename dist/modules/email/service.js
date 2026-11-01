import { prisma } from '../../db/prisma.js';
import { encrypt } from '../../services/crypto.js';
import { logger } from '../../services/logger.js';
/**
 * Real outbound delivery engine supporting Resend and Brevo APIs
 */
async function dispatchExternalEmail(options) {
    const resendKey = process.env.RESEND_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY;
    if (resendKey) {
        try {
            const fromAddr = process.env.MAIL_FROM || 'Global CRM <onboarding@resend.dev>';
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: fromAddr,
                    to: [options.to],
                    subject: options.subject,
                    html: options.html,
                    text: options.text,
                }),
            });
            if (res.ok) {
                logger.info('email', `Delivered real email to ${options.to} via Resend`);
                return { delivered: true, provider: 'resend' };
            }
            const data = await res.json().catch(() => ({}));
            logger.warn('email', `Resend delivery failed for ${options.to}: ${data.message || res.status}`);
            return { delivered: false, error: data.message || `HTTP ${res.status}` };
        }
        catch (err) {
            return { delivered: false, error: err.message };
        }
    }
    if (brevoKey) {
        try {
            const fromAddr = process.env.MAIL_FROM || 'crm@globalleadcrm.com';
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': brevoKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: { email: fromAddr, name: 'Global CRM' },
                    to: [{ email: options.to }],
                    subject: options.subject,
                    htmlContent: options.html,
                    textContent: options.text,
                }),
            });
            if (res.ok) {
                logger.info('email', `Delivered real email to ${options.to} via Brevo`);
                return { delivered: true, provider: 'brevo' };
            }
            const data = await res.json().catch(() => ({}));
            return { delivered: false, error: data.message || `HTTP ${res.status}` };
        }
        catch (err) {
            return { delivered: false, error: err.message };
        }
    }
    logger.warn('email', `No external SMTP/Resend configured. Email saved in CRM database as internal record for: ${options.to}`);
    return { delivered: false, error: 'No external SMTP or Resend/Brevo API key configured in .env' };
}
export class EmailService {
    /**
     * Seed default sales email templates if none exist
     */
    async ensureDefaultTemplates() {
        const count = await prisma.emailTemplate.count();
        if (count > 0)
            return;
        const defaults = [
            {
                name: 'Cold Outreach - Digital Growth',
                subject: 'Quick question regarding {{name}} online presence',
                bodyHtml: '<p>Hi {{name}},</p><p>I noticed your business in {{city}} and loved the work you are doing in the {{category}} sector. Are you currently taking on new clients this month?</p><p>We specialize in driving high-intent customer acquisition for local leaders. Would you be open to a brief 5-minute chat this week?</p><p>Best regards,<br/>The Growth Team</p>',
                bodyText: 'Hi {{name}},\n\nI noticed your business in {{city}} and loved the work you are doing in the {{category}} sector. Are you currently taking on new clients this month?\n\nWould you be open to a brief 5-minute chat this week?\n\nBest regards,\nThe Growth Team',
                category: 'outreach',
                variables: ['name', 'city', 'category'],
            },
            {
                name: 'First Follow-Up (No Reply)',
                subject: 'Following up: Growth strategy for {{name}}',
                bodyHtml: '<p>Hi {{name}},</p><p>Following up on my previous note. I know you are busy managing operations at {{name}}. Just wanted to see if exploring new qualified leads is on your radar this quarter?</p><p>Let me know if Tuesday or Thursday works better for a quick call.</p><p>Best regards,</p>',
                bodyText: 'Hi {{name}},\n\nFollowing up on my previous note. I know you are busy managing operations. Just wanted to see if exploring new qualified leads is on your radar this quarter?\n\nBest regards,',
                category: 'followup',
                variables: ['name'],
            },
            {
                name: 'Meeting Confirmation',
                subject: 'Confirmed: Strategy Meeting with {{name}}',
                bodyHtml: '<p>Hi {{name}},</p><p>Thank you for connecting! Looking forward to our scheduled discussion to review your growth roadmap.</p><p>Feel free to reply directly to this email if you need to adjust our meeting time.</p>',
                bodyText: 'Hi {{name}},\n\nThank you for connecting! Looking forward to our scheduled discussion to review your growth roadmap.\n\nBest regards,',
                category: 'meeting',
                variables: ['name'],
            },
        ];
        for (const t of defaults) {
            await prisma.emailTemplate.create({ data: t });
        }
        logger.info('email', `Seeded ${defaults.length} default commercial email templates.`);
    }
    /**
     * Send an email and attach it to the Lead timeline
     */
    async sendEmail(input) {
        let fromEmail = 'crm@crm.local';
        const account = await prisma.emailAccount.findFirst({
            where: { userId: input.userId, isDefault: true },
        });
        if (account) {
            fromEmail = account.email;
        }
        // Replace variables in subject and body if leadId is provided
        let subject = input.subject;
        let bodyHtml = input.bodyHtml || `<p>${input.bodyText || ''}</p>`;
        let bodyText = input.bodyText || '';
        if (input.leadId) {
            const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
            if (lead) {
                const replaceMap = {
                    name: lead.name,
                    city: lead.city,
                    country: lead.country,
                    category: lead.categoryName || 'business',
                    website: lead.website || '',
                };
                for (const [k, v] of Object.entries(replaceMap)) {
                    const reg = new RegExp(`{{${k}}}`, 'g');
                    subject = subject.replace(reg, v);
                    bodyHtml = bodyHtml.replace(reg, v);
                    bodyText = bodyText.replace(reg, v);
                }
            }
        }
        // Dispatch real external email if Resend or Brevo is configured
        const dispatchResult = await dispatchExternalEmail({
            from: fromEmail,
            to: input.to,
            subject,
            html: bodyHtml,
            text: bodyText,
        });
        const messageStatus = dispatchResult.delivered ? 'sent' : 'mock_sent';
        // Save EmailMessage record
        const message = await prisma.emailMessage.create({
            data: {
                leadId: input.leadId,
                userId: input.userId,
                direction: 'outbound',
                from: fromEmail,
                to: input.to,
                subject,
                bodyHtml,
                bodyText,
                status: messageStatus,
                messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            },
        });
        // Automatically record event on lead timeline
        if (input.leadId) {
            await prisma.leadEvent.create({
                data: {
                    leadId: input.leadId,
                    type: 'email_out',
                    actorId: input.userId,
                    payload: {
                        subject,
                        to: input.to,
                        from: fromEmail,
                        messageId: message.id,
                    },
                },
            });
            // Update lead status to 'contacted' if still 'new'
            const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
            if (lead && lead.status === 'new') {
                await prisma.lead.update({
                    where: { id: input.leadId },
                    data: { status: 'contacted' },
                });
            }
        }
        return {
            ...message,
            delivered: dispatchResult.delivered,
            deliveryNotice: dispatchResult.delivered ? 'Sent via live mail provider' : dispatchResult.error,
        };
    }
    /**
     * List email messages
     */
    async listEmails(query) {
        const where = {};
        if (query.leadId)
            where.leadId = query.leadId;
        if (query.userId)
            where.userId = query.userId;
        return prisma.emailMessage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: query.limit || 50,
        });
    }
    /**
     * List email templates
     */
    async getTemplates() {
        await this.ensureDefaultTemplates();
        return prisma.emailTemplate.findMany({
            orderBy: { createdAt: 'asc' },
        });
    }
    /**
     * Create an email template
     */
    async createTemplate(input) {
        return prisma.emailTemplate.create({
            data: {
                name: input.name,
                subject: input.subject,
                bodyHtml: input.bodyHtml,
                bodyText: input.bodyText,
                category: input.category || 'general',
            },
        });
    }
    /**
     * Add email account credentials (encrypted)
     */
    async addEmailAccount(input) {
        const credentialsEnc = encrypt(JSON.stringify(input.credentials));
        if (input.isDefault) {
            await prisma.emailAccount.updateMany({
                where: { userId: input.userId },
                data: { isDefault: false },
            });
        }
        return prisma.emailAccount.create({
            data: {
                userId: input.userId,
                provider: input.provider,
                email: input.email,
                senderName: input.senderName,
                credentialsEnc,
                isDefault: input.isDefault ?? true,
            },
        });
    }
    /**
     * List accounts configured for user
     */
    async getEmailAccounts(userId) {
        const accounts = await prisma.emailAccount.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return accounts.map((a) => ({
            id: a.id,
            email: a.email,
            provider: a.provider,
            senderName: a.senderName,
            isDefault: a.isDefault,
            createdAt: a.createdAt,
        }));
    }
}
export const emailService = new EmailService();
//# sourceMappingURL=service.js.map