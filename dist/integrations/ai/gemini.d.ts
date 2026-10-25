import { AiProvider } from './AiProvider.js';
export declare class GeminiProvider implements AiProvider {
    id: "gemini";
    testConnection(auth: {
        apiKey: string;
    }): Promise<{
        ok: boolean;
        message: string;
        latencyMs?: number;
    }>;
    generate(prompt: string, auth: {
        apiKey: string;
    }): Promise<string>;
    summarize(text: string, auth: {
        apiKey: string;
    }): Promise<string>;
    score(leadInfo: unknown, auth: {
        apiKey: string;
    }): Promise<{
        value: number;
        reason: string;
    }>;
}
export declare const geminiProvider: GeminiProvider;
//# sourceMappingURL=gemini.d.ts.map