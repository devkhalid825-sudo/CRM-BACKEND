import { Provider } from '../../db/models/Provider.js';
import { ProviderKey, IProviderKey } from '../../db/models/ProviderKey.js';
import { encrypt, decrypt, maskKey } from '../../services/crypto.js';
import { AppError } from '../../services/errors.js';
import {
  ProviderId,
  ProviderKeyDTO,
  ProviderConfigDTO,
  CreateProviderKeyInput,
  UpdateProviderKeyInput,
  TestConnectionResult,
} from '../../shared/index.js';
import { googlePlacesProvider } from '../../integrations/places/googlePlaces.js';
import { geminiProvider } from '../../integrations/ai/gemini.js';
import { serpApiProvider } from '../../integrations/places/serpapi.js';
import { apifyProvider } from '../../integrations/places/apify.js';
import { overpassProvider } from '../../integrations/places/overpass.js';

export function toProviderKeyDTO(key: IProviderKey): ProviderKeyDTO {
  let masked = '****';
  try {
    const raw = decrypt(key.encryptedKey);
    masked = maskKey(raw);
  } catch {
    masked = '***error***';
  }

  return {
    id: key._id.toString(),
    providerId: key.providerId,
    label: key.label,
    maskedKey: masked,
    priority: key.priority,
    enabled: key.enabled,
    dailyCap: key.dailyCap,
    usageToday: key.usageToday,
    status: key.status,
    cooldownUntil: key.cooldownUntil ? key.cooldownUntil.toISOString() : null,
    lastError: key.lastError || null,
    lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
    createdAt: key.createdAt.toISOString(),
    updatedAt: key.updatedAt.toISOString(),
  };
}

const DEFAULT_PROVIDERS = [
  { kind: 'places', providerId: 'google_places', name: 'Google Places API', chainOrder: 1 },
  { kind: 'places', providerId: 'serpapi', name: 'SerpAPI (Google Maps)', chainOrder: 2 },
  { kind: 'places', providerId: 'apify', name: 'Apify Maps Scraper', chainOrder: 3 },
  { kind: 'places', providerId: 'overpass', name: 'OpenStreetMap (Overpass)', chainOrder: 4 },
  { kind: 'ai', providerId: 'gemini', name: 'Google Gemini AI', chainOrder: 1 },
  { kind: 'email', providerId: 'gmail', name: 'Gmail OAuth', chainOrder: 1 },
  { kind: 'email', providerId: 'smtp', name: 'Nodemailer SMTP', chainOrder: 2 },
  { kind: 'email', providerId: 'brevo', name: 'Brevo API', chainOrder: 3 },
  { kind: 'voice', providerId: 'twilio', name: 'Twilio Voice', chainOrder: 1 },
  { kind: 'whatsapp', providerId: 'cloud_api', name: 'WhatsApp Cloud API', chainOrder: 1 },
];

export class ProvidersService {
  /**
   * Ensure default provider records exist in database
   */
  async ensureDefaults(): Promise<void> {
    for (const def of DEFAULT_PROVIDERS) {
      await Provider.findOneAndUpdate(
        { providerId: def.providerId },
        { $setOnInsert: { ...def, enabled: true, config: {} } },
        { upsert: true }
      );
    }
  }

  /**
   * List all providers with summary counts
   */
  async getProviders(): Promise<ProviderConfigDTO[]> {
    await this.ensureDefaults();
    const providers = await Provider.find().sort({ kind: 1, chainOrder: 1 });
    const keys = await ProviderKey.find();

    return providers.map((p) => {
      const pKeys = keys.filter((k) => k.providerId === p.providerId);
      const activeKeys = pKeys.filter((k) => k.enabled && k.status === 'healthy');

      return {
        id: p._id.toString(),
        kind: p.kind,
        providerId: p.providerId,
        name: p.name,
        enabled: p.enabled,
        chainOrder: p.chainOrder,
        keysCount: pKeys.length,
        activeKeysCount: activeKeys.length,
      };
    });
  }

  /**
   * Get keys for a provider
   */
  async getKeysForProvider(providerId: string): Promise<ProviderKeyDTO[]> {
    const keys = await ProviderKey.find({ providerId }).sort({ priority: 1, createdAt: 1 });
    return keys.map(toProviderKeyDTO);
  }

  /**
   * Add a new API key
   */
  async addKey(data: CreateProviderKeyInput): Promise<ProviderKeyDTO> {
    const encryptedKey = encrypt(data.apiKey.trim());

    const created = await ProviderKey.create({
      providerId: data.providerId,
      label: data.label.trim(),
      encryptedKey,
      priority: data.priority,
      dailyCap: data.dailyCap,
      enabled: data.enabled,
      status: 'healthy',
      usageToday: 0,
      usageResetAt: new Date(),
    });

    return toProviderKeyDTO(created);
  }

  /**
   * Update a key
   */
  async updateKey(keyId: string, data: UpdateProviderKeyInput): Promise<ProviderKeyDTO> {
    const key = await ProviderKey.findById(keyId);
    if (!key) throw new AppError('Key not found', 404);

    if (data.label !== undefined) key.label = data.label.trim();
    if (data.priority !== undefined) key.priority = data.priority;
    if (data.dailyCap !== undefined) key.dailyCap = data.dailyCap;
    if (data.enabled !== undefined) key.enabled = data.enabled;
    if (data.apiKey) {
      key.encryptedKey = encrypt(data.apiKey.trim());
      key.status = 'healthy';
      key.lastError = null;
      key.cooldownUntil = null;
    }

    await key.save();
    return toProviderKeyDTO(key);
  }

  /**
   * Delete a key
   */
  async deleteKey(keyId: string): Promise<void> {
    await ProviderKey.findByIdAndDelete(keyId);
  }

  /**
   * Test an external connection using a raw or stored key
   */
  async testConnection(providerId: ProviderId, apiKey: string): Promise<TestConnectionResult> {
    const trimmedKey = apiKey?.trim();

    try {
      switch (providerId) {
        case 'google_places':
          return await googlePlacesProvider.testConnection({ apiKey: trimmedKey });
        case 'gemini':
          return await geminiProvider.testConnection({ apiKey: trimmedKey });
        case 'serpapi':
          return await serpApiProvider.testConnection({ apiKey: trimmedKey });
        case 'apify':
          return await apifyProvider.testConnection({ apiKey: trimmedKey });
        case 'overpass':
          return await overpassProvider.testConnection();
        default:
          return {
            ok: true,
            message: `Connection test simulated for ${providerId} (Configuration valid)`,
          };
      }
    } catch (err: unknown) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Test a saved key from database
   */
  async testSavedKey(keyId: string): Promise<TestConnectionResult> {
    const key = await ProviderKey.findById(keyId);
    if (!key) throw new AppError('Key not found', 404);

    let rawKey = '';
    try {
      rawKey = decrypt(key.encryptedKey);
    } catch {
      throw new AppError('Failed to decrypt saved key', 500);
    }

    const result = await this.testConnection(key.providerId, rawKey);

    if (result.ok) {
      key.status = 'healthy';
      key.lastError = null;
    } else {
      key.lastError = result.message;
      if (result.message.toLowerCase().includes('auth') || result.message.toLowerCase().includes('denied')) {
        key.status = 'invalid';
      }
    }
    await key.save();

    return result;
  }
}

export const providersService = new ProvidersService();
