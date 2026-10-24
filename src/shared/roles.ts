import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'manager', 'sales', 'viewer', 'client']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ROLES: Record<UserRole, UserRole> = {
  admin: 'admin',
  manager: 'manager',
  sales: 'sales',
  viewer: 'viewer',
  client: 'client',
};

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

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessConsole: true,
    canManageUsers: true,
    canManageIntegrations: true,
    canManageConfig: true,
    canViewLogs: true,
    canManageJobs: true,
    canViewAllLeads: true,
    canAssignLeads: true,
    canEditAssignedLeads: true,
    canExportLeads: true,
    canRestoreArchived: true,
  },
  manager: {
    canAccessConsole: false,
    canManageUsers: false,
    canManageIntegrations: false,
    canManageConfig: false,
    canViewLogs: false,
    canManageJobs: false,
    canViewAllLeads: true,
    canAssignLeads: true,
    canEditAssignedLeads: true,
    canExportLeads: true,
    canRestoreArchived: false,
  },
  sales: {
    canAccessConsole: false,
    canManageUsers: false,
    canManageIntegrations: false,
    canManageConfig: false,
    canViewLogs: false,
    canManageJobs: false,
    canViewAllLeads: false, // Sales sees only assigned leads
    canAssignLeads: false,
    canEditAssignedLeads: true,
    canExportLeads: false,
    canRestoreArchived: false,
  },
  viewer: {
    canAccessConsole: false,
    canManageUsers: false,
    canManageIntegrations: false,
    canManageConfig: false,
    canViewLogs: false,
    canManageJobs: false,
    canViewAllLeads: false,
    canAssignLeads: false,
    canEditAssignedLeads: false,
    canExportLeads: false,
    canRestoreArchived: false,
  },
  client: {
    canAccessConsole: false,
    canManageUsers: false,
    canManageIntegrations: false,
    canManageConfig: false,
    canViewLogs: false,
    canManageJobs: false,
    canViewAllLeads: false,
    canAssignLeads: false,
    canEditAssignedLeads: false,
    canExportLeads: false,
    canRestoreArchived: false,
  },
};

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return !!ROLE_PERMISSIONS[role]?.[permission];
}
