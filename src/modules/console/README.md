# Admin Console Module

Dedicated control center for system administrators.

## Features
- **Strict Server RBAC**: Non-admin users are strictly blocked (HTTP 403 Forbidden).
- **Environment & Runtime Config**: Dynamic encrypted configuration store with live reload (zero downtime).
- **.env Import**: Automatically classifies lines into bootstrap (read-only) vs runtime (encrypted in DB) with diff preview.
- **Audit Logs**: Comprehensive tamper-evident history of administrative actions.
- **System Logs**: Live queryable capped log collection with Socket.IO streaming.
- **System Health**: MongoDB ping, process memory, and key status summaries.
