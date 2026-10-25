import mongoose, { Schema } from 'mongoose';
const AuditLogSchema = new Schema({
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    target: { type: String, required: true },
    beforeMasked: { type: Schema.Types.Mixed, default: null },
    afterMasked: { type: Schema.Types.Mixed, default: null },
    ip: { type: String },
}, {
    timestamps: true,
});
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
//# sourceMappingURL=AuditLog.js.map