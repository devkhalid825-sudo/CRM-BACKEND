import mongoose from 'mongoose';
import { Provider } from '../../db/models/Provider.js';
import { ProviderKey, IProviderKey } from '../../db/models/ProviderKey.js';
import { prisma } from '../../db/prisma.js';
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
import { serperProvider } from '../../integrations/places/serper.js';
import { apifyProvider } from '../../integrations/places/apify.js';
import { overpassProvider } from '../../integrations/places/overpass.js';

export function toProviderKeyDTO(key: any): ProviderKeyDTO {
  let masked = '****';
  try {
    const raw = decrypt(key.encryptedKey);
    masked = maskKey(raw);
  } catch {
    masked = '***error***';
  }

  return {
    id: key.id || key._id?.toString(),
    providerId: key.providerId,
    label: key.label,
    maskedKey: masked,
    priority: key.priority,
    enabled: key.enabled,
    dailyCap: key.dailyCap,
    usageToday: key.usageToday,
    status: key.status,
    cooldownUntil: key.cooldownUntil ? new Date(key.cooldownUntil).toISOString() : null,
    lastError: key.lastError || null,
    lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt).toISOString() : null,
    createdAt: key.createdAt ? new Date(key.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: key.updatedAt ? new Date(key.updatedAt).toISOString() : new Date().toISOString(),
  };
}

const DEFAULT_PROVIDERS = [
  { kind: 'places', providerId: 'google_places', name: 'Google Places API', chainOrder: 1 },
  { kind: 'places', providerId: 'serper', name: 'Serper.dev (Google Maps Fast)', chainOrder: 2 },
  { kind: 'places', providerId: 'serpapi', name: 'SerpAPI (Google Maps)', chainOrder: 3 },
  { kind: 'places', providerId: 'apify', name: 'Apify Maps Scraper', chainOrder: 4 },
  { kind: 'places', providerId: 'overpass', name: 'OpenStreetMap (Overpass)', chainOrder: 5 },
  { kind: 'ai', providerId: 'gemini', name: 'Google Gemini AI', chainOrder: 1 },
  { kind: 'email', providerId: 'gmail', name: 'Gmail OAuth', chainOrder: 1 },
  { kind: 'email', providerId: 'smtp', name: 'Nodemailer SMTP', chainOrder: 2 },
  { kind: 'email', providerId: 'brevo', name: 'Brevo API', chainOrder: 3 },
  { kind: 'voice', providerId: 'twilio', name: 'Twilio Voice', chainOrder: 1 },
  { kind: 'whatsapp', providerId: 'cloud_api', name: 'WhatsApp Cloud API', chainOrder: 1 },
];

export class ProvidersService {
  private isMongo(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Ensure default provider records exist in database
   */
  async ensureDefaults(): Promise<void> {
    if (!this.isMongo()) {
      for (const def of DEFAULT_PROVIDERS) {
        await prisma.provider.upsert({
          where: { providerId: def.providerId },
          update: {},
          create: {
            kind: def.kind,
            providerId: def.providerId,
            name: def.name,
            chainOrder: def.chainOrder,
            enabled: true,
            config: {},
          },
        });
      }
      return;
    }

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

    if (!this.isMongo()) {
      const providers = await prisma.provider.findMany({
        orderBy: [{ kind: 'asc' }, { chainOrder: 'asc' }],
      });
      const keys = await prisma.providerKey.findMany();

      return providers.map((p) => {
        const pKeys = keys.filter((k) => k.providerId === p.providerId);
        const activeKeys = pKeys.filter((k) => k.enabled && k.status === 'healthy');

        return {
          id: p.id,
          kind: p.kind as any,
          providerId: p.providerId as any,
          name: p.name,
          enabled: p.enabled,
          chainOrder: p.chainOrder,
          keysCount: pKeys.length,
          activeKeysCount: activeKeys.length,
        };
      });
    }

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
    if (!this.isMongo()) {
      const keys = await prisma.providerKey.findMany({
        where: { providerId },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });
      return keys.map(toProviderKeyDTO);
    }

    const keys = await ProviderKey.find({ providerId }).sort({ priority: 1, createdAt: 1 });
    return keys.map(toProviderKeyDTO);
  }

  /**
   * Add a new API key
   */
  async addKey(data: CreateProviderKeyInput): Promise<ProviderKeyDTO> {
    const encryptedKey = encrypt(data.apiKey.trim());

    if (!this.isMongo()) {
      const created = await prisma.providerKey.create({
        data: {
          providerId: data.providerId,
          label: data.label.trim(),
          encryptedKey,
          priority: data.priority,
          dailyCap: data.dailyCap,
          enabled: data.enabled,
          status: 'healthy',
          usageToday: 0,
          usageResetAt: new Date(),
        },
      });
      return toProviderKeyDTO(created);
    }

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
    if (!this.isMongo()) {
      const key = await prisma.providerKey.findUnique({ where: { id: keyId } });
      if (!key) throw new AppError('Key not found', 404);

      const updateData: any = {};
      if (data.label !== undefined) updateData.label = data.label.trim();
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.dailyCap !== undefined) updateData.dailyCap = data.dailyCap;
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.apiKey) {
        updateData.encryptedKey = encrypt(data.apiKey.trim());
        updateData.status = 'healthy';
        updateData.lastError = null;
        updateData.cooldownUntil = null;
      }

      const updated = await prisma.providerKey.update({
        where: { id: keyId },
        data: updateData,
      });
      return toProviderKeyDTO(updated);
    }

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
    if (!this.isMongo()) {
      await prisma.providerKey.delete({ where: { id: keyId } });
      return;
    }
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
        case 'serper':
          return await serperProvider.testConnection({ apiKey: trimmedKey });
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
    let providerId = '';
    let encryptedKey = '';

    if (!this.isMongo()) {
      const key = await prisma.providerKey.findUnique({ where: { id: keyId } });
      if (!key) throw new AppError('Key not found', 404);
      providerId = key.providerId;
      encryptedKey = key.encryptedKey;

      let rawKey = '';
      try {
        rawKey = decrypt(encryptedKey);
      } catch {
        throw new AppError('Failed to decrypt saved key', 500);
      }

      const result = await this.testConnection(providerId as ProviderId, rawKey);

      await prisma.providerKey.update({
        where: { id: keyId },
        data: {
          status: result.ok ? 'healthy' : result.message.toLowerCase().includes('auth') ? 'invalid' : 'healthy',
          lastError: result.ok ? null : result.message,
        },
      });

      return result;
    }

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
