import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemLog extends Document {
  level: string;
  module: string;
  msg: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const SystemLogSchema = new Schema<ISystemLog>(
  {
    level: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    msg: { type: String, required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    capped: { size: 104857600, max: 100000 }, // 100MB capped collection
  }
);

export const SystemLog = mongoose.model<ISystemLog>('SystemLog', SystemLogSchema);
