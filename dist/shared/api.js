import { z } from 'zod';
import { UserRoleSchema } from './roles.js';
export const LoginSchema = z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    twoFactorCode: z.string().length(6, '2FA code must be 6 digits').optional(),
});
export const Setup2FASchema = z.object({
// empty or password verification
});
export const Verify2FASchema = z.object({
    token: z.string().length(6, '2FA code must be 6 digits'),
});
export const CreateUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: UserRoleSchema,
});
export const UpdateUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: UserRoleSchema.optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).optional(),
});
//# sourceMappingURL=api.js.map