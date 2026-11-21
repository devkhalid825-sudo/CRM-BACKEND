import { logger } from '../../services/logger.js';
import { GeminiProvider } from '../../integrations/ai/gemini.js';
import { keyPool } from '../../services/keyPool.js';

const geminiProvider = new GeminiProvider();

export class UnifiedAiService {
  /**
   * Helper to fetch AI response with multi-key failover:
   * Groq -> Gemini -> OpenRouter -> OpenAI -> Built-in Sales Strategy Engine
   */
  async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens = 800
  ): Promise<string> {
    // 1. Try Groq Cloud (Ultra-Fast LPU Engine with key rotation)
    try {
      const dynamicGroqKeys = await keyPool.getAvailableKeys('groq').catch(() => []);
      const envGroqKeys = (process.env.GROQ_API_KEY || process.env.GROQ_KEY || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const allGroqKeys = Array.from(
        new Set([
          ...dynamicGroqKeys.map((k) => k.rawKey),
          ...envGroqKeys,
        ])
      );

      if (allGroqKeys.length > 0) {
        const candidateModels = [
          'llama-3.3-70b-versatile',
          'llama-3.1-8b-instant',
          'llama3-70b-8192',
          'llama3-8b-8192',
          'mixtral-8x7b-32768',
          'gemma2-9b-it',
        ];

        for (const groqKey of allGroqKeys) {
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
                signal: AbortSignal.timeout(12000),
              });

              if (res.ok) {
                const data: any = await res.json();
                const text = data?.choices?.[0]?.message?.content;
                if (text) {
                  logger.info('ai', `Generated response via Groq (${model})`);
                  return text;
                }
              }
            } catch (err: any) {
              logger.warn('ai', `Groq model ${model} failed: ${err.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn('ai', `Groq attempt failed: ${err.message}`);
    }

    // 2. Try Google Gemini AI with multi-key rotation
    try {
      logger.info('ai', 'Evaluating Google Gemini AI key pool...');
      const keys = await keyPool.getAvailableKeys('gemini').catch(() => []);
      const envGeminiKeys = (process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const allGeminiKeys = Array.from(
        new Set([
          ...keys.map((k) => k.rawKey),
          ...envGeminiKeys,
        ])
      );

      const fullPrompt = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

      for (const geminiKey of allGeminiKeys) {
        try {
          const text = await geminiProvider.generate(fullPrompt, { apiKey: geminiKey });
          if (text) {
            logger.info('ai', 'Generated response via Gemini AI');
            return text;
          }
        } catch (err: any) {
          logger.warn('ai', `Gemini key failed: ${err.message}, checking next key...`);
        }
      }
    } catch (err: any) {
      logger.warn('ai', `Gemini attempt failed: ${err.message}`);
    }

    // 3. Fallback to OpenRouter (Free community models)
    try {
      const openRouterKeys = await keyPool.getAvailableKeys('openrouter').catch(() => []);
      const envOpenRouter = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const allOpenRouterKeys = Array.from(
        new Set([
          ...openRouterKeys.map((k) => k.rawKey),
          ...envOpenRouter,
        ])
      );

      if (allOpenRouterKeys.length > 0) {
        const freeModels = [
          'meta-llama/llama-3.3-70b-instruct:free',
          'google/gemini-2.0-flash-exp:free',
          'deepseek/deepseek-r1:free',
          'qwen/qwen-2.5-72b-instruct:free',
        ];

        for (const openRouterKey of allOpenRouterKeys) {
          for (const model of freeModels) {
            try {
              const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${openRouterKey}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'https://global-lead-crm.local',
                  'X-Title': 'Global CRM Copilot',
                },
                body: JSON.stringify({
                  model,
                  messages,
                  max_tokens: maxTokens,
                  temperature: 0.7,
                }),
                signal: AbortSignal.timeout(12000),
              });

              if (res.ok) {
                const data: any = await res.json();
                const text = data?.choices?.[0]?.message?.content;
                if (text) {
                  logger.info('ai', `Generated response via OpenRouter (${model})`);
                  return text;
                }
              }
            } catch (err: any) {
              logger.warn('ai', `OpenRouter model ${model} failed: ${err.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn('ai', `OpenRouter attempt failed: ${err.message}`);
    }

    // 4. Fallback to OpenAI if key provided
    if (process.env.OPENAI_API_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok) {
          const data: any = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text;
        }
      } catch (err: any) {
        logger.warn('ai', `OpenAI fallback failed: ${err.message}`);
      }
    }

    // 5. Intelligent Offline Sales Knowledge Engine (Zero-Downtime Guarantee)
    logger.warn('ai', 'All external AI keys reached quota. Serving via Built-in Sales Strategy Engine.');
    return this.generateIntelligentOfflineFallback(messages);
  }

  /**
   * Intelligent offline strategy fallback: handles objections and pitch questions even when API keys are exhausted
   */
  private generateIntelligentOfflineFallback(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): string {
    const userMsg = (messages[messages.length - 1]?.content || '').toLowerCase();

    // 1. Objection: Price is too high / Expensive / Budget
    if (userMsg.includes('price') || userMsg.includes('expensive') || userMsg.includes('budget') || userMsg.includes('cost') || userMsg.includes('discount')) {
      return `### 💡 How to Handle "Price is Too High / Too Expensive"

1. **Reframe from Cost to ROI:**
   - *"I completely understand budget is top of mind. But let me ask you: if an upgraded high-speed web funnel brings you just 2 extra high-ticket clients every month, wouldn't the system pay for itself within 30 days?"*

2. **Anchor Against Inaction (Opportunity Cost):**
   - *"Right now, potential buyers in your city are searching on Google and Instagram. If your site doesn't load instantly or have direct WhatsApp checkout, they click your competitor. That lost revenue is costing you 5x what this project costs."*

3. **Break Down into Monthly Milestones:**
   - Offer a 2-part milestone structure (50% upfront, 50% upon delivery and live testing).

4. **Copy-Paste WhatsApp Script:**
   > *"Hi [Name], totally understand keeping budgets tight. Our clients in [City] usually see this as an investment that recovers itself in 3-4 weeks because of the direct customer booking flow we build. Would you be open to a quick 5-min screen share where I show you the exact numbers?"*`;
    }

    // 2. Objection: "Send me an email" / Busy / Gatekeeper
    if (userMsg.includes('email') || userMsg.includes('send') || userMsg.includes('busy') || userMsg.includes('later')) {
      return `### ⚡ How to Handle "Just Send Me An Email"

1. **Pattern Interrupt:**
   - *"I will gladly send that over right away! So I don't flood your inbox with a generic 20-page PDF, what is the single biggest bottleneck in your customer acquisition right now — traffic or converting visitors into calls?"*

2. **Micro-Commitment Close:**
   - *"I'm emailing you the teardown now. I'll include a 90-second video specifically reviewing your digital presence. Can I WhatsApp you the direct link so you don't have to dig through spam?"*

3. **Copy-Paste WhatsApp Follow-Up:**
   > *"Hi [Name], just sent the growth breakdown to your inbox as requested. Also summarized the top 3 quick wins in a 1-minute audio note here for your convenience. Let me know when you have 2 mins to listen!"*`;
    }

    // 3. Objection: "We already have someone / Software house"
    if (userMsg.includes('already have') || userMsg.includes('someone') || userMsg.includes('agency') || userMsg.includes('in-house')) {
      return `### 🎯 How to Handle "We Already Have an Agency / Developer"

1. **Compliment & Reframe as a Second Opinion:**
   - *"That's great! It shows you value your digital growth. We don't replace your existing team — think of us as a specialized conversion auditor. We often spot hidden tracking leaks and speed drop-offs that standard developers overlook."*

2. **Free Value Benchmark:**
   - *"Let me run a free 2-minute Core Web Vitals and Meta Pixel audit on your site. If everything is 100% optimized, at least you have peace of mind. If there are leaks, you can ask your team to fix them. Fair enough?"*`;
    }

    // 4. Request for WhatsApp / Pitch Copy
    if (userMsg.includes('whatsapp') || userMsg.includes('pitch') || userMsg.includes('message') || userMsg.includes('template')) {
      return `### 🚀 High-Converting B2B WhatsApp Outreach Pitch

**Hook:**
> *"Hi [Name], came across [Business Name] in [City]. Love your branding, but noticed visitors on mobile don't have a 1-click WhatsApp booking button or fast-loading landing page."*

**Value Proposition:**
> *"We help [Industry] brands in [City] increase verified direct inquiries by 40% with high-converting web systems and targeted Meta funnels."*

**Low-Friction Call to Action:**
> *"I put together a 60-second mockup of what a modern booking funnel would look like for you. Mind if I share the link here?"*

**Golden Rule:** Keep it under 60 words, end with an easy question, and always personalize with their city and business name.`;
    }

    // 5. General Sales Strategy
    return `### 💼 B2B Closing Strategy & Sales Recommendation

1. **Diagnose Before You Pitch:**
   - Never talk about features (WordPress, React, Next.js). Only speak about **revenue, lead volume, and client trust**.

2. **The 3-Step Cold Outreach Formula:**
   - **Step 1 (Observation):** Mention their business name and a specific observation in their city.
   - **Step 2 (The Gap):** Point out what's missing (missing Meta Pixel, slow mobile site, no instant WhatsApp link).
   - **Step 3 (The Bridge):** Offer a free 2-minute diagnostic or custom mockup.

3. **Quick Objection Tip:**
   - When a client hesitates, ask: *"On a scale of 1 to 10, how confident are you that your current online setup is capturing every single customer looking for your services right now?"* Anything less than a 9 is your opening to close.`;
  }

  /**
   * Interactive AI Sales Copilot Chatbot
   */
  async chatWithCopilot(
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    const systemPrompt = `You are "Global CRM Sales Copilot", an elite B2B digital sales strategist and high-ticket closer.
Your mission:
1. Help sales agents handle objections (e.g., "price too high", "we already have someone", "send me an email").
2. Polish sales pitches into crisp, luxury B2B English.
3. Suggest deal structuring, pricing, and rapid closing tactics for web development, Meta ads, SEO, and tech services.
4. Keep answers actionable, concise, bullet-pointed, and ready to copy-paste. Never ramble.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6), // keep last 6 turns for context
      { role: 'user', content: userMessage },
    ];

    return this.generateCompletion(messages, 800);
  }

  /**
   * 1-Click Multi-Language Pitch Translator
   */
  async translatePitch(text: string, targetLanguage: string): Promise<string> {
    const prompt = `Translate the following B2B sales pitch into fluent, culturally natural, highly persuasive ${targetLanguage}.
Maintain the same professional, high-converting luxury tone. Output ONLY the translated pitch text without any commentary or prefixes.

Sales Pitch to translate:
"${text}"`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
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
