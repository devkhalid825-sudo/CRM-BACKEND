import { Router } from 'express';
import { unifiedAiService } from './service.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Interactive AI Sales Copilot Chat
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const reply = await unifiedAiService.chatWithCopilot(message, history || []);
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'AI chat failed' });
  }
});

// Multi-Language Pitch Translator
router.post('/translate', async (req, res, next) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and targetLanguage are required' });
    }

    const translatedText = await unifiedAiService.translatePitch(text, targetLanguage);
    res.json({ success: true, translatedText });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Translation failed' });
  }
});

export const aiRoutes = router;
