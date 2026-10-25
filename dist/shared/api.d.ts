import { z } from 'zod';
import { UserRoleSchema } from './roles.js';
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    twoFactorCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    twoFactorCode?: string | undefined;
}, {
    email: string;
    password: string;
    twoFactorCode?: string | undefined;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const Setup2FASchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const Verify2FASchema: z.ZodObject<{
    token: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
}, {
    token: string;
}>;
export type Verify2FAInput = z.infer<typeof Verify2FASchema>;
export declare const CreateUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<["admin", "manager", "sales", "viewer", "client"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
    role: "admin" | "manager" | "sales" | "viewer" | "client";
}, {
    email: string;
    password: string;
    name: string;
    role: "admin" | "manager" | "sales" | "viewer" | "client";
}>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["admin", "manager", "sales", "viewer", "client"]>>;
    active: z.ZodOptional<z.ZodBoolean>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    password?: string | undefined;
    name?: string | undefined;
    role?: "admin" | "manager" | "sales" | "viewer" | "client" | undefined;
    active?: boolean | undefined;
}, {
    email?: string | undefined;
    password?: string | undefined;
    name?: string | undefined;
    role?: "admin" | "manager" | "sales" | "viewer" | "client" | undefined;
    active?: boolean | undefined;
}>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export interface UserDTO {
    id: string;
    name: string;
    email: string;
    role: z.infer<typeof UserRoleSchema>;
    active: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: string;
}
export interface AuthResponse {
    user: UserDTO;
    accessToken: string;
    requires2FA?: boolean;
    tempToken?: string;
}
export interface AppConfigDTO {
    id: string;
    key: string;
    maskedValue: string;
    group: string;
    version: number;
    updatedBy?: string;
    updatedAt: string;
}
export interface ImportEnvItem {
    key: string;
    value: string;
    type: 'bootstrap' | 'runtime';
    group?: string;
}
export interface ImportEnvPreview {
    items: ImportEnvItem[];
    runtimeCount: number;
    bootstrapCount: number;
}
export interface SystemLogDTO {
    id: string;
    level: string;
    module: string;
    msg: string;
    meta?: Record<string, unknown>;
    createdAt: string;
}
export interface AuditLogDTO {
    id: string;
    actorId?: string;
    actorEmail?: string;
    action: string;
    target: string;
    beforeMasked?: Record<string, unknown> | null;
    afterMasked?: Record<string, unknown> | null;
    ip?: string;
    createdAt: string;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
//# sourceMappingURL=api.d.ts.map