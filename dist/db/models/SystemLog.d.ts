import mongoose, { Document } from 'mongoose';
export interface ISystemLog extends Document {
    level: string;
    module: string;
    msg: string;
    meta?: Record<string, unknown>;
    createdAt: Date;
}
export declare const SystemLog: mongoose.Model<ISystemLog, {}, {}, {}, mongoose.Document<unknown, {}, ISystemLog, {}, {}> & ISystemLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SystemLog.d.ts.map