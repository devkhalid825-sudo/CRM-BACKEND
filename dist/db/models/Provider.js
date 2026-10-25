import mongoose, { Schema } from 'mongoose';
const ProviderSchema = new Schema({
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
}, {
    timestamps: true,
});
export const Provider = mongoose.model('Provider', ProviderSchema);
//# sourceMappingURL=Provider.js.map