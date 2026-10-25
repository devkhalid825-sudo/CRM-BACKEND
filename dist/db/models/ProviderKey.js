import mongoose, { Schema } from 'mongoose';
const ProviderKeySchema = new Schema({
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
}, {
    timestamps: true,
});
export const ProviderKey = mongoose.model('ProviderKey', ProviderKeySchema);
//# sourceMappingURL=ProviderKey.js.map