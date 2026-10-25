import mongoose, { Document } from 'mongoose';
import { KeyStatus, ProviderId } from '../../shared/index.js';
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
export declare const ProviderKey: mongoose.Model<IProviderKey, {}, {}, {}, mongoose.Document<unknown, {}, IProviderKey, {}, {}> & IProviderKey & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ProviderKey.d.ts.map