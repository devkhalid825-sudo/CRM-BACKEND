# Users Module

Handles user administration and role-based access control.

## Features
- **Role Assignment**: Supports `admin`, `manager`, `sales`, `viewer`, and `client`.
- **Soft Deletion**: Users are marked with `archivedAt` timestamps, preventing accidental permanent data loss. Only Admins can restore.
- **Audit Logs**: Every user creation, status change, and role update is recorded in the audit trail.
