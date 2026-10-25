import mongoose, { Document } from 'mongoose';
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
export declare const AuditLog: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AuditLog.d.ts.map