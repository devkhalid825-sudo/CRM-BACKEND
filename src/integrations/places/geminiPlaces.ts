import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { AuthError, QuotaExceededError, RateLimitedError, TransientError } from '../../services/errors.js';
import { logger } from '../../services/logger.js';

export class GeminiPlacesProvider implements PlacesProvider {
  id = 'gemini' as any;

  async testConnection(auth: { apiKey?: string }): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!auth.apiKey) throw new AuthError('Gemini API key is required');
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(auth.apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 403) throw new AuthError('Invalid Gemini API key');
        if (res.status === 429) throw new QuotaExceededError('Gemini quota exhausted');
        throw new TransientError(`Gemini error HTTP ${res.status}`);
      }
      return { ok: true, message: `Gemini AI Connected successfully (${latencyMs}ms)`, latencyMs };
    } catch (err: any) {
      if (err instanceof AuthError || err instanceof QuotaExceededError) throw err;
      throw new TransientError(`Failed to reach Gemini: ${err.message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string },
    auth: { apiKey?: string }
  ): Promise<PlaceResult[]> {
    if (!auth.apiKey) throw new AuthError('Gemini API key is required');

    const locationDesc = q.cell
      ? `around coordinates lat: ${q.cell.lat}, lng: ${q.cell.lng}`
      : q.country;

    const prompt = `You are an elite B2B Directory & Commercial Intelligence search engine.
Extract and compile an extensive, accurate directory of 40 to 60 real, verified commercial businesses matching category "${q.keyword}" located in ${locationDesc}, country: "${q.country}".

Strict Requirements:
1. Return realistic and accurate names, actual business phone numbers with international dialing codes, official websites, and physical addresses.
2. Output ONLY a valid raw JSON array of objects with no markdown codeblocks, no formatting text, and no preamble.
3. Every object must follow this exact JSON schema:
[
  {
    "name": "Exact Business Name",
    "phone": "+97141234567",
    "website": "https://company.ae",
    "address": "Street Address, District",
    "city": "City Name",
    "category": "${q.keyword}",
    "rating": 4.6
  }
]`;

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest',
    ];
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          auth.apiKey
        )}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(25000),
        });

        if (!response.ok) {
          if (response.status === 400 || response.status === 401 || response.status === 403) {
            throw new AuthError(`Gemini Auth Failed (${response.status})`);
          }
          if (response.status === 429) {
            throw new QuotaExceededError('Gemini quota exceeded');
          }
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        let items: any[] = [];
        try {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          items = JSON.parse(cleaned);
        } catch {
          logger.warn('gemini_places', 'Failed to parse Gemini JSON output', {
            rawSnippet: rawText.slice(0, 150),
          });
          items = [];
        }

        if (!Array.isArray(items) || items.length === 0) continue;

        return items.map((item: any, idx: number) => ({
          placeKey: `gemini_${(item.name || 'biz').replace(/\s+/g, '_')}_${item.city || q.country}_${idx}`,
          name: item.name,
          phone: item.phone,
          website: item.website,
          address: item.address,
          city: item.city,
          rating: typeof item.rating === 'number' ? item.rating : 4.5,
          country: q.country,
          lat: q.cell?.lat,
          lng: q.cell?.lng,
          raw: item,
        }));
      } catch (err: any) {
        if (err instanceof AuthError || err instanceof QuotaExceededError) throw err;
        lastErr = err;
      }
    }

    if (lastErr) {
      logger.error('gemini_places', `Gemini place search failed: ${lastErr.message}`);
    }
    return [];
  }
}

export const geminiPlacesProvider = new GeminiPlacesProvider();
