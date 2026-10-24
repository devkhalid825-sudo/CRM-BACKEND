import mongoose, { Document, Schema } from 'mongoose';
import { ProviderKind, ProviderId } from '../../shared/index.js';

export interface IProvider extends Document {
  kind: ProviderKind;
  providerId: ProviderId;
  name: string;
  enabled: boolean;
  chainOrder: number;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<IProvider>(
  {
    kind: {
      type: String,
      enum: ['places', 'ai', 'email', 'voice', 'whatsapp', 'ads'],
      required: true,
      index: true,
    },
    providerId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    chainOrder: { type: Number, default: 1 },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const Provider = mongoose.model<IProvider>('Provider', ProviderSchema);
