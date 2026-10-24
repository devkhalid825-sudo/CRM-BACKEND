import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  action: string;
  target: string;
  beforeMasked?: Record<string, unknown> | null;
  afterMasked?: Record<string, unknown> | null;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail: { type: String },
    action: { type: String, required: true, index: true },
    target: { type: String, required: true },
    beforeMasked: { type: Schema.Types.Mixed, default: null },
    afterMasked: { type: Schema.Types.Mixed, default: null },
    ip: { type: String },
  },
  {
    timestamps: true,
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
