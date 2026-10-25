import mongoose, { Document } from 'mongoose';
import { ProviderKind, ProviderId } from '../../shared/index.js';
export interface IProvider extends Document {
    kind: ProviderKind;
    providerId: ProviderId;
    name: string;
    enabled: boolean;
    chainOrder: number;
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Provider: mongoose.Model<IProvider, {}, {}, {}, mongoose.Document<unknown, {}, IProvider, {}, {}> & IProvider & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Provider.d.ts.map