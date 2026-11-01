import { prisma } from '../../db/prisma.js';
import { logger } from '../../services/logger.js';

export class CommsService {
  /**
   * Voice call dispatcher: handles telephony dispatch and automatic call logging
   */
  async initiateCall(leadId: string, phone: string, userId: string) {
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Record Call Log in database
    const callLog = await prisma.callLog.create({
      data: {
        leadId,
        userId,
        direction: 'outbound',
        outcome: 'connected',
        durationSec: 0,
        notes: `Outbound call initiated to ${cleanPhone}`,
      },
    });

    // Record on lead timeline
    await prisma.leadEvent.create({
      data: {
        leadId,
        type: 'call',
        actorId: userId,
        payload: {
          phone: cleanPhone,
          callLogId: callLog.id,
          initiatedAt: new Date().toISOString(),
        },
      },
    });

    return {
      callLogId: callLog.id,
      telUri: `tel:${cleanPhone}`,
      phone: cleanPhone,
      status: 'initiated',
    };
  }

  /**
   * WhatsApp dispatcher: logs WhatsApp event and returns certified wa.me dispatch URL
   */
  async sendWhatsApp(leadId: string, phone: string, text: string, userId: string) {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;

    await prisma.leadEvent.create({
      data: {
        leadId,
        type: 'whatsapp',
        actorId: userId,
        payload: {
          phone: cleanPhone,
          text,
          dispatchedAt: new Date().toISOString(),
        },
      },
    });

    // Advance lead status to contacted if new
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead && lead.status === 'new') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'contacted' },
      });
    }

    logger.info('comms', `WhatsApp outreach logged for lead ${leadId} to ${cleanPhone}`);

    return {
      success: true,
      waUrl,
      phone: cleanPhone,
    };
  }
}

export const commsService = new CommsService();
