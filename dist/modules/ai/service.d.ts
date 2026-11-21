export declare class UnifiedAiService {
    /**
     * Helper to fetch AI response with multi-key failover:
     * Groq -> Gemini -> OpenRouter -> OpenAI -> Built-in Sales Strategy Engine
     */
    generateCompletion(messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>, maxTokens?: number): Promise<string>;
    /**
     * Intelligent offline strategy fallback: handles objections and pitch questions even when API keys are exhausted
     */
    private generateIntelligentOfflineFallback;
    /**
     * Interactive AI Sales Copilot Chatbot
     */
    chatWithCopilot(userMessage: string, history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>): Promise<string>;
    /**
     * 1-Click Multi-Language Pitch Translator
     */
    translatePitch(text: string, targetLanguage: string): Promise<string>;
}
export declare const unifiedAiService: UnifiedAiService;
//# sourceMappingURL=service.d.ts.map