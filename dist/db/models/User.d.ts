import mongoose, { Document } from 'mongoose';
import { UserRole } from '../../shared/index.js';
export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    twoFactor: {
        enabled: boolean;
        secretEnc?: string;
    };
    active: boolean;
    googleTokens?: {
        enc?: string;
    };
    lastLoginAt?: Date;
    archivedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map