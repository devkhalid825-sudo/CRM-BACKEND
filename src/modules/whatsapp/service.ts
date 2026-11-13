import path from 'path';
import fs from 'fs';
import https from 'https';
import QRCode from 'qrcode';
import pino from 'pino';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../services/logger.js';

interface UserWhatsAppSession {
  userId: string;
  socket: any | null;
  status: 'disconnected' | 'connecting' | 'connected';
  qrCodeUrl: string | null;
  phone: string | null;
  name: string | null;
}

const sessions = new Map<string, UserWhatsAppSession>();

// Ensure base storage directory for sessions
const SESSIONS_BASE_DIR = path.resolve(process.cwd(), 'data', 'wa-sessions');
if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}

export class WhatsAppService {
  /**
   * Get current session status for a specific user
   */
  async getStatus(userId: string) {
    const session = sessions.get(userId);
    if (!session) {
      // Check if session directory exists
      const userDir = path.join(SESSIONS_BASE_DIR, userId);
      const credsExist = fs.existsSync(path.join(userDir, 'creds.json'));
      if (credsExist) {
        // Attempt background reconnect
        this.startSession(userId).catch(() => {});
        return { status: 'connecting', phone: null, qrCodeUrl: null };
      }
      return { status: 'disconnected', phone: null, qrCodeUrl: null };
    }

    return {
      status: session.status,
      phone: session.phone,
      name: session.name,
      qrCodeUrl: session.qrCodeUrl,
    };
  }

  /**
   * Start WhatsApp session and return QR code
   */
  async startSession(userId: string): Promise<{ status: string; qrCodeUrl: string | null; phone?: string | null }> {
    let session = sessions.get(userId);
    if (session && session.status === 'connected') {
      return { status: 'connected', phone: session.phone, qrCodeUrl: null };
    }

    // Gracefully clean up any hanging previous socket
    if (session?.socket) {
      try {
        session.socket.end(new Error('Starting fresh session'));
      } catch {}
    }

    const userDir = path.join(SESSIONS_BASE_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    let baileys: any;
    try {
      baileys = await import('@whiskeysockets/baileys');
    } catch (err: any) {
      logger.error('whatsapp', `Baileys import failed: ${err.message}`);
      throw new Error('Baileys WhatsApp library is not installed on the server. Please run "npm install" in backend directory.');
    }

    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;
    const { state, saveCreds } = await useMultiFileAuthState(userDir);

    const silentLogger = pino({ level: 'silent' });
    const agent = new https.Agent({ rejectUnauthorized: false });

    const sock = makeWASocket({
      auth: state,
      logger: silentLogger,
      printQRInTerminal: false,
      browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'],
      agent,
    });

    session = {
      userId,
      socket: sock,
      status: 'connecting',
      qrCodeUrl: null,
      phone: null,
      name: null,
    };
    sessions.set(userId, session);

    sock.ev.on('creds.update', saveCreds);

    return new Promise((resolve) => {
      let resolved = false;

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            session!.qrCodeUrl = qrDataUrl;
            session!.status = 'connecting';
            if (!resolved) {
              resolved = true;
              resolve({ status: 'connecting', qrCodeUrl: qrDataUrl });
            }
          } catch (err) {
            logger.error('whatsapp', `Failed to generate QR: ${err}`);
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id || '';
          const cleanPhone = userJid.split(':')[0] || userJid.split('@')[0];
          session!.status = 'connected';
          session!.phone = cleanPhone;
          session!.name = sock.user?.name || 'WhatsApp User';
          session!.qrCodeUrl = null;

          logger.info('whatsapp', `User ${userId} successfully linked WhatsApp: +${cleanPhone}`);

          if (!resolved) {
            resolved = true;
            resolve({ status: 'connected', phone: cleanPhone, qrCodeUrl: null });
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          logger.warn('whatsapp', `Connection closed for user ${userId}, statusCode: ${statusCode}`);

          if (shouldReconnect) {
            session!.status = 'connecting';
            this.startSession(userId).catch(() => {});
          } else {
            session!.status = 'disconnected';
            session!.socket = null;
            session!.phone = null;
            session!.qrCodeUrl = null;
            // Clean up session directory if logged out
            try {
              fs.rmSync(userDir, { recursive: true, force: true });
            } catch {}
          }

          if (!resolved) {
            resolved = true;
            resolve({ status: 'disconnected', qrCodeUrl: null });
          }
        }
      });

      // 12 second fallback timeout so HTTP response does not hang
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            status: session?.status || 'connecting',
            qrCodeUrl: session?.qrCodeUrl || null,
            phone: session?.phone || null,
          });
        }
      }, 12000);
    });
  }

  /**
   * Log out / disconnect WhatsApp session
   */
  async disconnect(userId: string) {
    const session = sessions.get(userId);
    if (session?.socket) {
      try {
        await session.socket.logout();
      } catch {
        // ignore logout error
      }
      try {
        session.socket.end(undefined);
      } catch {}
    }

    sessions.delete(userId);

    const userDir = path.join(SESSIONS_BASE_DIR, userId);
    try {
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
      }
    } catch {}

    logger.info('whatsapp', `User ${userId} disconnected WhatsApp session`);
    return { success: true };
  }

  /**
   * Send a single direct text message
   */
  async sendMessage(userId: string, rawPhone: string, text: string, leadId?: string) {
    const session = sessions.get(userId);
    if (!session || session.status !== 'connected' || !session.socket) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    const cleanPhone = rawPhone.replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error(`Invalid phone number: ${rawPhone}`);
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;

    await session.socket.sendMessage(jid, { text });

    if (leadId) {
      await prisma.leadEvent.create({
        data: {
          leadId,
          type: 'whatsapp',
          actorId: userId,
          payload: {
            phone: cleanPhone,
            text,
            direction: 'outbound_direct',
            sentAt: new Date().toISOString(),
          },
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'contacted' },
      }).catch(() => {});
    }

    return { success: true, phone: cleanPhone };
  }

  /**
   * Send bulk broadcast messages with anti-ban delay pacing
   */
  async sendBulkBroadcast(
    userId: string,
    leads: Array<{ id: string; name: string; phone?: string; phoneNorm?: string; phones?: string[]; city?: string; categoryName?: string }>,
    template: string,
    delaySeconds = 4
  ) {
    const session = sessions.get(userId);
    if (!session || session.status !== 'connected' || !session.socket) {
      throw new Error('WhatsApp is not connected. Please scan QR code in the top bar.');
    }

    const results: Array<{ id: string; name: string; phone: string; status: 'sent' | 'failed'; error?: string }> = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const phone = lead.phoneNorm || (Array.isArray(lead.phones) && lead.phones[0]) || lead.phone;
      const cleanPhone = phone ? phone.replace(/[^\d]/g, '') : null;

      if (!cleanPhone) {
        results.push({ id: lead.id, name: lead.name, phone: 'No Phone', status: 'failed', error: 'Missing phone' });
        continue;
      }

      // Format dynamic variables
      const personalizedText = template
        .replace(/{{name}}/g, lead.name)
        .replace(/{{business}}/g, lead.name)
        .replace(/{{city}}/g, lead.city || 'your area')
        .replace(/{{category}}/g, lead.categoryName?.split('(')[0]?.trim() || 'business');

      try {
        const jid = `${cleanPhone}@s.whatsapp.net`;
        await session.socket.sendMessage(jid, { text: personalizedText });

        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            type: 'whatsapp',
            actorId: userId,
            payload: {
              phone: cleanPhone,
              text: personalizedText,
              batchBroadcast: true,
              sentAt: new Date().toISOString(),
            },
          },
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'contacted' },
        }).catch(() => {});

        results.push({ id: lead.id, name: lead.name, phone: cleanPhone, status: 'sent' });
      } catch (err: any) {
        results.push({ id: lead.id, name: lead.name, phone: cleanPhone, status: 'failed', error: err.message });
      }

      // Anti-ban human jitter sleep between messages (except for last item)
      if (i < leads.length - 1) {
        const jitter = Math.floor(Math.random() * 2000); // 0-2 seconds random jitter
        const sleepMs = Math.max(3000, delaySeconds * 1000 + jitter);
        await new Promise((r) => setTimeout(r, sleepMs));
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    return {
      total: leads.length,
      sentCount,
      failedCount: leads.length - sentCount,
      results,
    };
  }
}

export const whatsAppService = new WhatsAppService();
