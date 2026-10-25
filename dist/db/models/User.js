import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
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
}, {
    timestamps: true,
});
export const User = mongoose.model('User', UserSchema);
//# sourceMappingURL=User.js.map