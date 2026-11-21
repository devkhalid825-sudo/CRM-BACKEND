import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../services/logger.js';

// Prevent Node TLS / SSL leaf certificate rejections on EC2 and proxy connections
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface UserWhatsAppSession {
  userId: string;
  socket: any | null;
  status: 'disconnected' | 'connecting' | 'connected';
  qrCodeUrl: string | null;
  phone: string | null;
  name: string | null;
}

const sessions = new Map<string, UserWhatsAppSession>();

// Ensure base storage directory for sessions reliably
function getSessionsBaseDir(): string {
  const inAppsApi = path.resolve(process.cwd(), 'apps', 'api', 'data', 'wa-sessions');
  const inRoot = path.resolve(process.cwd(), 'data', 'wa-sessions');
  const chosen = fs.existsSync(path.resolve(process.cwd(), 'apps', 'api', 'data')) ? inAppsApi : inRoot;
  if (!fs.existsSync(chosen)) {
    fs.mkdirSync(chosen, { recursive: true });
  }
  return chosen;
}

export class WhatsAppService {
  /**
   * Get current session status for a specific user
   */
  async getStatus(userId: string) {
    const session = sessions.get(userId);
    if (!session) {
      // Check if session credentials exist on disk
      const userDir = path.join(getSessionsBaseDir(), userId);
      const credsPath = path.join(userDir, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          const rawPhone = creds.me?.id || '';
          const cleanPhone = rawPhone.split(':')[0] || rawPhone.split('@')[0] || null;
          const name = creds.me?.name || 'WhatsApp User';
          if (cleanPhone) {
            // Auto reconnect socket in background if credentials exist
            this.startSession(userId).catch(() => {});
            return { status: 'connected', phone: cleanPhone, name, qrCodeUrl: null };
          }
        } catch {}
      }
      return { status: 'disconnected', phone: null, name: null, qrCodeUrl: null };
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
  async startSession(
    userId: string,
    forceFresh = false
  ): Promise<{ status: string; qrCodeUrl: string | null; phone?: string | null; name?: string | null }> {
    let session = sessions.get(userId);

    const baseDir = getSessionsBaseDir();
    const userDir = path.join(baseDir, userId);

    if (forceFresh) {
      if (session?.socket) {
        try {
          session.socket.ev.removeAllListeners('connection.update');
          session.socket.ev.removeAllListeners('creds.update');
          session.socket.end(undefined);
        } catch {}
      }
      sessions.delete(userId);
      session = undefined;
      try {
        fs.rmSync(userDir, { recursive: true, force: true });
      } catch {}
    } else {
      if (session && session.status === 'connected' && session.socket) {
        return { status: 'connected', phone: session.phone, name: session.name, qrCodeUrl: null };
      }
      if (session && session.status === 'connecting' && session.qrCodeUrl) {
        return { status: 'connecting', qrCodeUrl: session.qrCodeUrl, phone: session.phone, name: session.name };
      }
    }

    // Gracefully clean up any hanging previous socket
    if (session?.socket) {
      try {
        session.socket.ev.removeAllListeners('connection.update');
        session.socket.ev.removeAllListeners('creds.update');
        session.socket.end(undefined);
      } catch {}
    }

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

    // Try reading phone if already saved in creds
    const preSavedPhone = state.creds?.me?.id
      ? state.creds.me.id.split(':')[0].split('@')[0]
      : null;
    const preSavedName = state.creds?.me?.name || null;

    // Fetch modern WhatsApp Web version to prevent handshake rejection
    const versionRes = await (baileys.fetchLatestBaileysVersion
      ? baileys.fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1043857760] }))
      : { version: [2, 3000, 1043857760] });

    const sock = makeWASocket({
      version: versionRes.version || [2, 3000, 1043857760],
      auth: state,
      logger: silentLogger,
      printQRInTerminal: false,
      browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'],
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 2000,
      getMessage: async () => undefined,
    });

    session = {
      userId,
      socket: sock,
      status: 'connecting',
      qrCodeUrl: null,
      phone: preSavedPhone,
      name: preSavedName,
    };
    sessions.set(userId, session);

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds();
      } catch (err: any) {
        logger.warn('whatsapp', `Failed to save creds: ${err.message}`);
      }
    });

    return new Promise((resolve) => {
      let resolved = false;

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            session!.qrCodeUrl = qrDataUrl;
            session!.status = 'connecting';
            logger.info('whatsapp', `Successfully generated WhatsApp QR code data URL for user ${userId}`);
            if (!resolved) {
              resolved = true;
              resolve({ status: 'connecting', qrCodeUrl: qrDataUrl, phone: session?.phone, name: session?.name });
            }
          } catch (err) {
            logger.error('whatsapp', `Failed to generate QR: ${err}`);
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id || state.creds?.me?.id || '';
          const cleanPhone = userJid.split(':')[0] || userJid.split('@')[0];
          session!.status = 'connected';
          session!.phone = cleanPhone;
          session!.name = sock.user?.name || state.creds?.me?.name || 'WhatsApp User';
          session!.qrCodeUrl = null;

          try {
            await saveCreds();
          } catch {}

          logger.info('whatsapp', `User ${userId} successfully linked WhatsApp: +${cleanPhone}`);

          if (!resolved) {
            resolved = true;
            resolve({ status: 'connected', phone: cleanPhone, name: session!.name, qrCodeUrl: null });
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          // In Baileys, 515 is restartRequired (which happens immediately upon QR scan/pairing).
          // Reconnect on any status code EXCEPT explicit 401 loggedOut.
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          logger.info('whatsapp', `Connection closed for user ${userId}, statusCode: ${statusCode}, shouldReconnect: ${shouldReconnect}`);

          if (shouldReconnect) {
            session!.status = 'connecting';
            // Reconnect after brief pause (1.2s) to allow handshake and creds to settle
            setTimeout(() => {
              this.startSession(userId).catch(() => {});
            }, 1200);
          } else {
            session!.status = 'disconnected';
            session!.socket = null;
            session!.phone = null;
            session!.name = null;
            session!.qrCodeUrl = null;
            try {
              fs.rmSync(userDir, { recursive: true, force: true });
            } catch {}
          }

          if (!resolved) {
            resolved = true;
            resolve({
              status: session?.status || 'disconnected',
              qrCodeUrl: session?.qrCodeUrl || null,
              phone: session?.phone || null,
              name: session?.name || null,
            });
          }
        }
      });

      // Fallback timeout so HTTP response does not hang
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            status: session?.status || 'connecting',
            qrCodeUrl: session?.qrCodeUrl || null,
            phone: session?.phone || null,
            name: session?.name || null,
          });
        }
      }, 10000);
    });
  }

  /**
   * Request an 8-character pairing code for linking directly via phone number
   */
  async requestPairingCode(userId: string, rawPhone: string): Promise<{ success: boolean; code?: string; phone?: string | null }> {
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error('Please enter a valid phone number with country code (e.g. 923001234567 or 971501234567)');
    }

    // Auto-normalize local numbers if country code was omitted
    if (cleanPhone.startsWith('03') && cleanPhone.length === 11) {
      cleanPhone = '92' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('05') && cleanPhone.length === 10) {
      cleanPhone = '971' + cleanPhone.slice(1);
    }

    let session = sessions.get(userId);
    // If not connected, start fresh session with clean state to prevent stale/corrupt credentials
    if (!session || !session.socket || session.status !== 'connected') {
      await this.startSession(userId, true);
      session = sessions.get(userId);
    }

    if (session?.status === 'connected') {
      return { success: true, code: 'ALREADY_CONNECTED', phone: session.phone };
    }

    if (!session?.socket) {
      throw new Error('Failed to initialize WhatsApp connection socket. Please try again.');
    }

    // Give socket brief moment to stabilize handshake if fresh
    await new Promise((r) => setTimeout(r, 1500));

    try {
      const code = await session.socket.requestPairingCode(cleanPhone);
      const formattedCode = code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
      logger.info('whatsapp', `Successfully requested pairing code for user ${userId} and phone ${cleanPhone}: ${formattedCode}`);
      return { success: true, code: formattedCode, phone: cleanPhone };
    } catch (err: any) {
      logger.error('whatsapp', `requestPairingCode error: ${err.message}`);
      throw new Error(err.message || 'Failed to request pairing code from WhatsApp. Try again in a few seconds.');
    }
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

    const userDir = path.join(getSessionsBaseDir(), userId);
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

  /**
   * Send document, image, or audio media via WhatsApp
   */
  async sendMediaMessage(
    userId: string,
    rawPhone: string,
    media: {
      type: 'document' | 'image' | 'audio';
      data: string | Buffer;
      fileName?: string;
      mimetype?: string;
      caption?: string;
    },
    leadId?: string
  ) {
    const session = sessions.get(userId);
    if (!session || session.status !== 'connected' || !session.socket) {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    const cleanPhone = rawPhone.replace(/[^\d]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      throw new Error(`Invalid phone number: ${rawPhone}`);
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const buffer =
      typeof media.data === 'string' && media.data.startsWith('data:')
        ? Buffer.from(media.data.split(',')[1], 'base64')
        : Buffer.isBuffer(media.data)
        ? media.data
        : typeof media.data === 'string'
        ? Buffer.from(media.data, 'base64')
        : Buffer.from(media.data);

    if (media.type === 'image') {
      await session.socket.sendMessage(jid, {
        image: buffer,
        caption: media.caption,
      });
    } else if (media.type === 'audio') {
      await session.socket.sendMessage(jid, {
        audio: buffer,
        mimetype: media.mimetype || 'audio/mp4',
        ptt: true,
      });
    } else {
      await session.socket.sendMessage(jid, {
        document: buffer,
        fileName: media.fileName || 'attachment.pdf',
        mimetype: media.mimetype || 'application/pdf',
        caption: media.caption,
      });
    }

    if (leadId) {
      await prisma.leadEvent.create({
        data: {
          leadId,
          type: 'whatsapp',
          actorId: userId,
          payload: {
            phone: cleanPhone,
            type: media.type,
            fileName: media.fileName,
            direction: 'outbound_direct',
            sentAt: new Date().toISOString(),
          },
        },
      }).catch(() => {});
    }

    return { success: true, phone: cleanPhone };
  }
}

export const whatsAppService = new WhatsAppService();
