import { z } from 'zod';
import { UserRoleSchema } from './roles.js';

export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  twoFactorCode: z.string().length(6, '2FA code must be 6 digits').optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const Setup2FASchema = z.object({
  // empty or password verification
});

export const Verify2FASchema = z.object({
  token: z.string().length(6, '2FA code must be 6 digits'),
});
export type Verify2FAInput = z.infer<typeof Verify2FASchema>;

export const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: UserRoleSchema,
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: UserRoleSchema.optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});
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
