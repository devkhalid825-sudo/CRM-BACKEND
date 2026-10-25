import { z } from 'zod';

export const ProviderKindSchema = z.enum(['places', 'ai', 'email', 'voice', 'whatsapp', 'ads']);
export type ProviderKind = z.infer<typeof ProviderKindSchema>;

export const ProviderIdSchema = z.enum([
  'google_places',
  'serper',
  'serpapi',
  'apify',
  'overpass',
  'gemini',
  'gmail',
  'smtp',
  'brevo',
  'resend',
  'twilio',
  'cloud_api',
  'meta_ad_library',
  'apify_ads',
]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const KeyStatusSchema = z.enum(['healthy', 'cooling_down', 'quota_over', 'invalid', 'disabled']);
export type KeyStatus = z.infer<typeof KeyStatusSchema>;

export const CreateProviderKeySchema = z.object({
  providerId: ProviderIdSchema,
  label: z.string().min(1, 'Label is required').max(100),
  apiKey: z.string().min(1, 'API Key is required'),
  priority: z.coerce.number().int().min(1).default(1),
  dailyCap: z.coerce.number().int().min(0).default(0), // 0 = unlimited
  enabled: z.boolean().default(true),
});
export type CreateProviderKeyInput = z.infer<typeof CreateProviderKeySchema>;

export const UpdateProviderKeySchema = z.object({
  label: z.string().min(1).max(100).optional(),
  apiKey: z.string().min(1).optional(), // optional on update
  priority: z.coerce.number().int().min(1).optional(),
  dailyCap: z.coerce.number().int().min(0).optional(),
  enabled: z.boolean().optional(),
});
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
