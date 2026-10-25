export interface AiProvider {
    id: 'gemini';
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
    testConnection(auth: {
        apiKey: string;
    }): Promise<{
        ok: boolean;
        message: string;
        latencyMs?: number;
    }>;
}
//# sourceMappingURL=AiProvider.d.ts.map