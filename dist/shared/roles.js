import { z } from 'zod';
export const UserRoleSchema = z.enum(['admin', 'manager', 'sales', 'viewer', 'client']);
export const ROLES = {
    admin: 'admin',
    manager: 'manager',
    sales: 'sales',
    viewer: 'viewer',
    client: 'client',
};
export const ROLE_PERMISSIONS = {
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
export function hasPermission(role, permission) {
    return !!ROLE_PERMISSIONS[role]?.[permission];
}
//# sourceMappingURL=roles.js.map