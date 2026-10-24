import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
