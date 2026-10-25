import { z } from 'zod';
export declare const ProviderKindSchema: z.ZodEnum<["places", "ai", "email", "voice", "whatsapp", "ads"]>;
export type ProviderKind = z.infer<typeof ProviderKindSchema>;
export declare const ProviderIdSchema: z.ZodEnum<["google_places", "serpapi", "apify", "overpass", "gemini", "gmail", "smtp", "brevo", "resend", "twilio", "cloud_api", "meta_ad_library", "apify_ads"]>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export declare const KeyStatusSchema: z.ZodEnum<["healthy", "cooling_down", "quota_over", "invalid", "disabled"]>;
export type KeyStatus = z.infer<typeof KeyStatusSchema>;
export declare const CreateProviderKeySchema: z.ZodObject<{
    providerId: z.ZodEnum<["google_places", "serpapi", "apify", "overpass", "gemini", "gmail", "smtp", "brevo", "resend", "twilio", "cloud_api", "meta_ad_library", "apify_ads"]>;
    label: z.ZodString;
    apiKey: z.ZodString;
    priority: z.ZodDefault<z.ZodNumber>;
    dailyCap: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    providerId: "google_places" | "serpapi" | "apify" | "overpass" | "gemini" | "gmail" | "smtp" | "brevo" | "resend" | "twilio" | "cloud_api" | "meta_ad_library" | "apify_ads";
    label: string;
    apiKey: string;
    priority: number;
    dailyCap: number;
    enabled: boolean;
}, {
    providerId: "google_places" | "serpapi" | "apify" | "overpass" | "gemini" | "gmail" | "smtp" | "brevo" | "resend" | "twilio" | "cloud_api" | "meta_ad_library" | "apify_ads";
    label: string;
    apiKey: string;
    priority?: number | undefined;
    dailyCap?: number | undefined;
    enabled?: boolean | undefined;
}>;
export type CreateProviderKeyInput = z.infer<typeof CreateProviderKeySchema>;
export declare const UpdateProviderKeySchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
    dailyCap: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    label?: string | undefined;
    apiKey?: string | undefined;
    priority?: number | undefined;
    dailyCap?: number | undefined;
    enabled?: boolean | undefined;
}, {
    label?: string | undefined;
    apiKey?: string | undefined;
    priority?: number | undefined;
    dailyCap?: number | undefined;
    enabled?: boolean | undefined;
}>;
export type UpdateProviderKeyInput = z.infer<typeof UpdateProviderKeySchema>;
export interface ProviderKeyDTO {
    id: string;
    providerId: ProviderId;
    label: string;
    maskedKey: string;
    priority: number;
    enabled: boolean;
    dailyCap: number;
    usageToday: number;
    status: KeyStatus;
    cooldownUntil: string | null;
    lastError: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface ProviderConfigDTO {
    id: string;
    kind: ProviderKind;
    providerId: ProviderId;
    name: string;
    enabled: boolean;
    chainOrder: number;
    keysCount: number;
    activeKeysCount: number;
}
export interface TestConnectionResult {
    ok: boolean;
    message: string;
    latencyMs?: number;
}
//# sourceMappingURL=provider.d.ts.map