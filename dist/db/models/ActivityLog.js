import mongoose, { Schema } from 'mongoose';
const ActivityLogSchema = new Schema({
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    meta: { type: Schema.Types.Mixed, default: {} },
}, {
    timestamps: true,
});
export const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
//# sourceMappingURL=ActivityLog.js.map