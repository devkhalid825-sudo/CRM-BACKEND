import mongoose, { Schema } from 'mongoose';
const SessionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true },
    ip: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true, index: { expires: '30d' } },
    revokedAt: { type: Date, default: null },
}, {
    timestamps: true,
});
export const Session = mongoose.model('Session', SessionSchema);
//# sourceMappingURL=Session.js.map