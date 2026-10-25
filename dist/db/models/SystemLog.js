import mongoose, { Schema } from 'mongoose';
const SystemLogSchema = new Schema({
    level: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    msg: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
}, {
    timestamps: { createdAt: true, updatedAt: false },
    capped: { size: 104857600, max: 100000 }, // 100MB capped collection
});
export const SystemLog = mongoose.model('SystemLog', SystemLogSchema);
//# sourceMappingURL=SystemLog.js.map