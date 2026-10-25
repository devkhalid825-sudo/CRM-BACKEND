import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["admin", "manager", "sales", "viewer", "client"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const ROLES: Record<UserRole, UserRole>;
export interface RolePermissions {
    canAccessConsole: boolean;
    canManageUsers: boolean;
    canManageIntegrations: boolean;
    canManageConfig: boolean;
    canViewLogs: boolean;
    canManageJobs: boolean;
    canViewAllLeads: boolean;
    canAssignLeads: boolean;
    canEditAssignedLeads: boolean;
    canExportLeads: boolean;
    canRestoreArchived: boolean;
}
export declare const ROLE_PERMISSIONS: Record<UserRole, RolePermissions>;
export declare function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean;
//# sourceMappingURL=roles.d.ts.map