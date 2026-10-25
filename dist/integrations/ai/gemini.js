import { AuthError, QuotaExceededError, RateLimitedError, TransientError, PermanentError } from '../../services/errors.js';
export class GeminiProvider {
    id = 'gemini';
    async testConnection(auth) {
        if (!auth.apiKey) {
            throw new AuthError('Gemini API key is required');
        }
        const start = Date.now();
        try {
            // Test listing models with key
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(auth.apiKey)}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const latencyMs = Date.now() - start;
            if (!response.ok) {
                let errMessage = `HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    if (errData?.error?.message) {
                        errMessage = errData.error.message;
                    }
                }
                catch {
                    // ignore
                }
                if (response.status === 400 || response.status === 401 || response.status === 403) {
                    throw new AuthError(`Gemini Auth Error: ${errMessage}`);
                }
                if (response.status === 429) {
                    throw new QuotaExceededError(`Gemini Quota/Rate limit: ${errMessage}`);
                }
                throw new TransientError(`Gemini API error: ${errMessage}`);
            }
            return {
                ok: true,
                message: `Connected successfully to Google Gemini API in ${latencyMs}ms`,
                latencyMs,
            };
        }
        catch (err) {
            if (err instanceof AuthError ||
                err instanceof QuotaExceededError ||
                err instanceof RateLimitedError ||
                err instanceof PermanentError ||
                err instanceof TransientError) {
                throw err;
            }
            throw new TransientError(`Failed to reach Gemini API: ${err.message}`);
        }
    }
    async generate(prompt, auth) {
        const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
        let lastErr = null;
        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(auth.apiKey)}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                });
                if (!response.ok) {
                    if (response.status === 400 || response.status === 401 || response.status === 403) {
                        throw new AuthError(`Gemini Auth Failed (${response.status})`);
                    }
                    if (response.status === 429) {
                        throw new QuotaExceededError('Gemini quota reached');
                    }
                    if (response.status === 404 || response.status === 503) {
                        lastErr = new TransientError(`Model ${model} returned ${response.status}`);
                        continue; // try next candidate model
                    }
                    throw new TransientError(`Gemini error: HTTP ${response.status}`);
                }
                const data = await response.json();
                return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
            catch (err) {
                if (err instanceof AuthError || err instanceof QuotaExceededError)
                    throw err;
                lastErr = err;
            }
        }
        throw lastErr || new TransientError('Failed to generate AI response from Gemini models');
    }
    async summarize(text, auth) {
        const prompt = `Summarize the following text concisely:\n\n${text}`;
        return this.generate(prompt, auth);
    }
    async score(leadInfo, auth) {
        const prompt = `Analyze this lead information and provide a score between 0 and 100 with a short reason in JSON format {"value": number, "reason": string}:\n\n${JSON.stringify(leadInfo)}`;
        const result = await this.generate(prompt, auth);
        try {
            const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
            return {
                value: typeof parsed.value === 'number' ? parsed.value : 50,
                reason: parsed.reason || 'Calculated from lead details',
            };
        }
        catch {
            return { value: 50, reason: 'AI analyzed lead details' };
        }
    }
}
export const geminiProvider = new GeminiProvider();
//# sourceMappingURL=gemini.js.map