import mongoose, { Schema } from 'mongoose';
const AppConfigSchema = new Schema({
    key: { type: String, required: true, unique: true, trim: true },
    valueEnc: { type: String, required: true },
    group: { type: String, default: 'general', index: true },
    version: { type: Number, default: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, {
    timestamps: true,
});
export const AppConfig = mongoose.model('AppConfig', AppConfigSchema);
//# sourceMappingURL=AppConfig.js.map