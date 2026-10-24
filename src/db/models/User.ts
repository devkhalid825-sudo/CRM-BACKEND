import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '@lead-crm/shared';

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

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'sales', 'viewer', 'client'],
      default: 'sales',
      required: true,
    },
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secretEnc: { type: String },
    },
    active: { type: Boolean, default: true },
    googleTokens: {
      enc: { type: String },
    },
    lastLoginAt: { type: Date },
    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
