# Providers & Keys Module

Manages third-party external integrations, API keys, and failover chains.

## Features
- **Key Encryption**: All API keys are encrypted at rest with AES-256-GCM.
- **Masking Everywhere**: Keys are displayed and logged only in masked format (`AIza****x9f2`).
- **Connection Testing**: Test connection endpoint checks API validity live before saving.
- **Key Status Management**: Tracks daily caps, usage counters, and exponential cooldowns.
