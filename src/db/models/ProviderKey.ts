import mongoose, { Document, Schema } from 'mongoose';
import { KeyStatus, ProviderId } from '@lead-crm/shared';

export interface IProviderKey extends Document {
  providerId: ProviderId;
  label: string;
  encryptedKey: string;
  priority: number;
  enabled: boolean;
  dailyCap: number;
  usageToday: number;
  usageResetAt: Date;
  status: KeyStatus;
  cooldownUntil?: Date | null;
  lastError?: string | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderKeySchema = new Schema<IProviderKey>(
  {
    providerId: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true },
    encryptedKey: { type: String, required: true },
    priority: { type: Number, default: 1, index: true },
    enabled: { type: Boolean, default: true, index: true },
    dailyCap: { type: Number, default: 0 },
    usageToday: { type: Number, default: 0 },
    usageResetAt: { type: Date, default: () => new Date() },
    status: {
      type: String,
      enum: ['healthy', 'cooling_down', 'quota_over', 'invalid', 'disabled'],
      default: 'healthy',
      index: true,
    },
    cooldownUntil: { type: Date, default: null },
    lastError: { type: String, default: null },
    lastUsedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const ProviderKey = mongoose.model<IProviderKey>('ProviderKey', ProviderKeySchema);
