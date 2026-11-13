import { logger } from '../../services/logger.js';
import { GeminiProvider } from '../../integrations/ai/gemini.js';
import { keyPool } from '../../services/keyPool.js';
const geminiProvider = new GeminiProvider();
export class UnifiedAiService {
    /**
     * Helper to fetch AI response with Groq primary and Gemini fallback
     */
    async generateCompletion(messages, maxTokens = 800) {
        const dynamicGroqKeys = await keyPool.getAvailableKeys('groq').catch(() => []);
        const groqKey = dynamicGroqKeys[0]?.rawKey ||
            process.env.GROQ_API_KEY ||
            '';
        // 1. Try Groq Cloud first (Ultra-Fast LPU Engine)
        if (groqKey) {
            const candidateModels = [
                'openai/gpt-oss-120b',
                'openai/gpt-oss-20b',
                'qwen/qwen3.8-27b',
                'canopylabs/orpheus-v1-english',
            ];
            for (const model of candidateModels) {
                try {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${groqKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model,
                            messages,
                            max_tokens: maxTokens,
                            temperature: 0.7,
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const text = data?.choices?.[0]?.message?.content;
                        if (text) {
                            logger.info('ai', `Generated response via Groq (${model})`);
                            return text;
                        }
                    }
                }
                catch (err) {
                    logger.warn('ai', `Groq model ${model} failed: ${err.message}, trying next...`);
                }
            }
        }
        // 2. Fallback to Google Gemini AI
        logger.info('ai', 'Falling back to Google Gemini AI...');
        try {
            const keys = await keyPool.getAvailableKeys('gemini').catch(() => []);
            const geminiKey = keys[0]?.rawKey || process.env.GEMINI_API_KEY || '';
            if (geminiKey) {
                const fullPrompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
                const text = await geminiProvider.generate(fullPrompt, { apiKey: geminiKey });
                if (text)
                    return text;
            }
        }
        catch (err) {
            logger.error('ai', `Gemini fallback failed: ${err.message}`);
        }
        throw new Error('AI service temporarily unavailable. Please check your Groq or Gemini API keys.');
    }
    /**
     * Interactive AI Sales Copilot Chatbot
     */
    async chatWithCopilot(userMessage, history = []) {
        const systemPrompt = `You are "Global CRM Sales Copilot", an elite B2B digital sales strategist and high-ticket closer.
Your mission:
1. Help sales agents handle objections (e.g., "price too high", "we already have someone", "send me an email").
2. Polish sales pitches into crisp, luxury B2B English.
3. Suggest deal structuring, pricing, and rapid closing tactics for web development, Meta ads, SEO, and tech services.
4. Keep answers actionable, concise, bullet-pointed, and ready to copy-paste. Never ramble.`;
        const messages = [
            { role: 'system', content: systemPrompt },
            ...history.slice(-6), // keep last 6 turns for context
            { role: 'user', content: userMessage },
        ];
        return this.generateCompletion(messages, 800);
    }
    /**
     * 1-Click Multi-Language Pitch Translator
     */
    async translatePitch(text, targetLanguage) {
        const prompt = `Translate the following B2B sales pitch into fluent, culturally natural, highly persuasive ${targetLanguage}.
Maintain the same professional, high-converting luxury tone. Output ONLY the translated pitch text without any commentary or prefixes.

Sales Pitch to translate:
"${text}"`;
        const messages = [
            {
                role: 'system',
                content: `You are an expert bilingual commercial copywriter translating B2B sales pitches into native ${targetLanguage}.`,
            },
            { role: 'user', content: prompt },
        ];
        return this.generateCompletion(messages, 500);
    }
}
export const unifiedAiService = new UnifiedAiService();
//# sourceMappingURL=service.js.map