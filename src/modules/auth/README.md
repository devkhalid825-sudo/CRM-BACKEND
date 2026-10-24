# Auth Module

Handles authentication, sessions, and multi-factor authorization.

## Features
- **Argon2 Password Hashing**: State-of-the-art secure password storage.
- **JWT Access Tokens**: Short-lived (15 minutes) bearer tokens.
- **Rotating Refresh Tokens**: Stored in httpOnly cookies and verified against active database sessions.
- **TOTP 2FA (otplib)**: Mandatory for Administrators, optional for other roles. Secret keys encrypted with AES-256-GCM.
- **Activity & Audit Logging**: Every login and 2FA modification is tracked.
