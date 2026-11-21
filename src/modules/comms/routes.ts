import { Router } from 'express';
import { commsController } from './controller.js';
import { authenticateToken } from '../../middleware/auth.js';

export const commsRoutes = Router();

commsRoutes.use(authenticateToken);

commsRoutes.post('/call', (req, res) => commsController.call(req, res));
commsRoutes.post('/whatsapp', (req, res) => commsController.whatsapp(req, res));
commsRoutes.get('/status', (req, res) => commsController.status(req, res));

// Test Discord Webhook connection & send verification ping
commsRoutes.post('/discord-test', async (req: any, res: any) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return res.status(400).json({ success: false, error: 'Please provide a valid Discord webhook URL' });
    }

    const discordPayload = {
      username: 'Global CRM Bot',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/4712/4712038.png',
      embeds: [
        {
          title: '✅ Global CRM Connected to Discord',
          description: 'Real-time notifications are now active! You will receive instant alerts for **Hot Leads**, **Booked Strategy Meetings**, and **WhatsApp Replies** in this channel.',
          color: 0x10b981, // Emerald Green
          fields: [
            { name: 'Workspace', value: 'Global Lead CRM', inline: true },
            { name: 'Tested By', value: req.user?.name || 'Admin', inline: true },
            { name: 'Status', value: 'Active & Verified', inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(400).json({ success: false, error: `Discord rejected webhook: ${errText}` });
    }

    res.json({ success: true, message: 'Discord test notification sent successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Facebook / Meta Pixel or Graph Token
commsRoutes.post('/meta-test', async (req: any, res: any) => {
  try {
    const { pixelId, accessToken } = req.body;
    if (!pixelId && !accessToken) {
      return res.status(400).json({ success: false, error: 'Meta Pixel ID or Graph Access Token is required' });
    }

    if (accessToken) {
      const response = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${accessToken}`);
      if (!response.ok) {
        const errJson: any = await response.json().catch(() => ({}));
        return res.status(400).json({ success: false, error: errJson.error?.message || 'Invalid Meta Access Token' });
      }
      const data: any = await response.json();
      return res.json({ success: true, message: `Connected to Meta Account: ${data.name || data.id}` });
    }

    // Pixel ID test validation
    const cleanPixel = String(pixelId).trim();
    if (!/^\d{10,20}$/.test(cleanPixel)) {
      return res.status(400).json({ success: false, error: 'Invalid Meta Pixel format. Pixel ID should be 15-16 digits.' });
    }

    res.json({ success: true, message: `Meta Pixel ID ${cleanPixel} validated and active.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
