import path from 'path';
import fs from 'fs';
import https from 'https';
import QRCode from 'qrcode';
import pino from 'pino';
import { prisma } from '../../db/prisma.js';
import { logger } from '../../services/logger.js';
const sessions = new Map();
// Ensure base storage directory for sessions reliably
function getSessionsBaseDir() {
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
    async getStatus(userId) {
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
                    // Background reconnect
                    this.startSession(userId).catch(() => { });
                    return { status: 'connecting', phone: cleanPhone, name, qrCodeUrl: null };
                }
                catch { }
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
    async startSession(userId) {
        let session = sessions.get(userId);
        if (session && session.status === 'connected' && session.socket) {
            return { status: 'connected', phone: session.phone, name: session.name, qrCodeUrl: null };
        }
        if (session && session.status === 'connecting' && session.qrCodeUrl) {
            return { status: 'connecting', qrCodeUrl: session.qrCodeUrl, phone: session.phone, name: session.name };
        }
        // Gracefully clean up any hanging previous socket
        if (session?.socket) {
            try {
                session.socket.ev.removeAllListeners('connection.update');
                session.socket.ev.removeAllListeners('creds.update');
                session.socket.end(new Error('Starting fresh session'));
            }
            catch { }
        }
        const baseDir = getSessionsBaseDir();
        const userDir = path.join(baseDir, userId);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        let baileys;
        try {
            baileys = await import('@whiskeysockets/baileys');
        }
        catch (err) {
            logger.error('whatsapp', `Baileys import failed: ${err.message}`);
            throw new Error('Baileys WhatsApp library is not installed on the server. Please run "npm install" in backend directory.');
        }
        const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = baileys;
        const { state, saveCreds } = await useMultiFileAuthState(userDir);
        // If session is unauthenticated, clean up stale/broken partial pre-keys to avoid MAC/handshake mismatch
        if (!state.creds?.registered && !state.creds?.me) {
            try {
                const existingFiles = fs.readdirSync(userDir);
                for (const file of existingFiles) {
                    if (file.startsWith('pre-key-') || file.startsWith('session-') || file.startsWith('app-state-sync-')) {
                        try {
                            fs.unlinkSync(path.join(userDir, file));
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }
        const silentLogger = pino({ level: 'silent' });
        // Try reading phone if already saved in creds
        const preSavedPhone = state.creds?.me?.id
            ? state.creds.me.id.split(':')[0].split('@')[0]
            : null;
        const preSavedName = state.creds?.me?.name || null;
        // Use TLS agent with rejectUnauthorized: false to prevent "unable to verify the first certificate" error
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const sock = makeWASocket({
            auth: state,
            logger: silentLogger,
            printQRInTerminal: false,
            browser: ['Ubuntu', 'Chrome', '22.04.4'],
            agent: httpsAgent,
            options: {
                agent: httpsAgent,
            },
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
        sock.ev.on('creds.update', saveCreds);
        return new Promise((resolve) => {
            let resolved = false;
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    try {
                        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
                        session.qrCodeUrl = qrDataUrl;
                        session.status = 'connecting';
                        logger.info('whatsapp', `Successfully generated WhatsApp QR code data URL for user ${userId}`);
                        if (!resolved) {
                            resolved = true;
                            resolve({ status: 'connecting', qrCodeUrl: qrDataUrl, phone: session?.phone, name: session?.name });
                        }
                    }
                    catch (err) {
                        logger.error('whatsapp', `Failed to generate QR: ${err}`);
                    }
                }
                if (connection === 'open') {
                    const userJid = sock.user?.id || state.creds?.me?.id || '';
                    const cleanPhone = userJid.split(':')[0] || userJid.split('@')[0];
                    session.status = 'connected';
                    session.phone = cleanPhone;
                    session.name = sock.user?.name || state.creds?.me?.name || 'WhatsApp User';
                    session.qrCodeUrl = null;
                    logger.info('whatsapp', `User ${userId} successfully linked WhatsApp: +${cleanPhone}`);
                    if (!resolved) {
                        resolved = true;
                        resolve({ status: 'connected', phone: cleanPhone, name: session.name, qrCodeUrl: null });
                    }
                }
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    // In Baileys, reconnect on any status code EXCEPT explicit loggedOut (401)
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    logger.warn('whatsapp', `Connection closed for user ${userId}, statusCode: ${statusCode}, shouldReconnect: ${shouldReconnect}`);
                    if (shouldReconnect) {
                        session.status = 'connecting';
                        // Reconnect after brief pause (1.5s) to allow handshake and creds to settle
                        setTimeout(() => {
                            this.startSession(userId).catch(() => { });
                        }, 1500);
                    }
                    else {
                        session.status = 'disconnected';
                        session.socket = null;
                        session.phone = null;
                        session.name = null;
                        session.qrCodeUrl = null;
                        try {
                            fs.rmSync(userDir, { recursive: true, force: true });
                        }
                        catch { }
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
    async requestPairingCode(userId, rawPhone) {
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
            throw new Error('Please enter a valid phone number with country code (e.g. 923001234567)');
        }
        let session = sessions.get(userId);
        // If not started or disconnected, start session first
        if (!session || !session.socket || session.status === 'disconnected') {
            await this.startSession(userId);
            session = sessions.get(userId);
        }
        if (session?.status === 'connected') {
            return { success: true, code: 'ALREADY_CONNECTED', phone: session.phone };
        }
        if (!session?.socket) {
            throw new Error('Failed to initialize WhatsApp connection socket');
        }
        // Give socket brief moment to stabilize handshake if fresh
        await new Promise((r) => setTimeout(r, 2000));
        try {
            const code = await session.socket.requestPairingCode(cleanPhone);
            const formattedCode = code && code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
            logger.info('whatsapp', `Successfully requested pairing code for user ${userId} and phone ${cleanPhone}: ${formattedCode}`);
            return { success: true, code: formattedCode, phone: cleanPhone };
        }
        catch (err) {
            logger.error('whatsapp', `requestPairingCode error: ${err.message}`);
            throw new Error(err.message || 'Failed to request pairing code from WhatsApp. Try again in a few seconds.');
        }
    }
    /**
     * Log out / disconnect WhatsApp session
     */
    async disconnect(userId) {
        const session = sessions.get(userId);
        if (session?.socket) {
            try {
                await session.socket.logout();
            }
            catch {
                // ignore logout error
            }
            try {
                session.socket.end(undefined);
            }
            catch { }
        }
        sessions.delete(userId);
        const userDir = path.join(getSessionsBaseDir(), userId);
        try {
            if (fs.existsSync(userDir)) {
                fs.rmSync(userDir, { recursive: true, force: true });
            }
        }
        catch { }
        logger.info('whatsapp', `User ${userId} disconnected WhatsApp session`);
        return { success: true };
    }
    /**
     * Send a single direct text message
     */
    async sendMessage(userId, rawPhone, text, leadId) {
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
            }).catch(() => { });
        }
        return { success: true, phone: cleanPhone };
    }
    /**
     * Send bulk broadcast messages with anti-ban delay pacing
     */
    async sendBulkBroadcast(userId, leads, template, delaySeconds = 4) {
        const session = sessions.get(userId);
        if (!session || session.status !== 'connected' || !session.socket) {
            throw new Error('WhatsApp is not connected. Please scan QR code in the top bar.');
        }
        const results = [];
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
                }).catch(() => { });
                results.push({ id: lead.id, name: lead.name, phone: cleanPhone, status: 'sent' });
            }
            catch (err) {
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
    async sendMediaMessage(userId, rawPhone, media, leadId) {
        const session = sessions.get(userId);
        if (!session || session.status !== 'connected' || !session.socket) {
            throw new Error('WhatsApp not connected. Please scan QR code first.');
        }
        const cleanPhone = rawPhone.replace(/[^\d]/g, '');
        if (!cleanPhone || cleanPhone.length < 8) {
            throw new Error(`Invalid phone number: ${rawPhone}`);
        }
        const jid = `${cleanPhone}@s.whatsapp.net`;
        const buffer = typeof media.data === 'string' && media.data.startsWith('data:')
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
        }
        else if (media.type === 'audio') {
            await session.socket.sendMessage(jid, {
                audio: buffer,
                mimetype: media.mimetype || 'audio/mp4',
                ptt: true,
            });
        }
        else {
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
            }).catch(() => { });
        }
        return { success: true, phone: cleanPhone };
    }
}
export const whatsAppService = new WhatsAppService();
//# sourceMappingURL=service.js.map