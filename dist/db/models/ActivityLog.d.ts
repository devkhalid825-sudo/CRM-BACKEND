import mongoose, { Document } from 'mongoose';
export interface IActivityLog extends Document {
    actorId?: mongoose.Types.ObjectId;
    action: string;
    entity: string;
    entityId?: string;
    meta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ActivityLog: mongoose.Model<IActivityLog, {}, {}, {}, mongoose.Document<unknown, {}, IActivityLog, {}, {}> & IActivityLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ActivityLog.d.ts.map