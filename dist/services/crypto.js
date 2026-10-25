import crypto from 'crypto';
import { env } from '../config/bootstrap.js';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard recommended IV length for GCM
const AUTH_TAG_LENGTH = 16;
let masterKeyBuffer;
try {
    masterKeyBuffer = Buffer.from(env.ENCRYPTION_MASTER_KEY, 'base64');
    if (masterKeyBuffer.length !== 32) {
        throw new Error('Master key must be 32 bytes');
    }
}
catch {
    throw new Error('Invalid ENCRYPTION_MASTER_KEY in environment');
}
/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns string formatted as: iv:authTag:encryptedText (in hex)
 */
export function encrypt(text) {
    if (!text)
        return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, masterKeyBuffer, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}
/**
 * Decrypt an AES-256-GCM encrypted string (format iv:authTag:encryptedText)
 */
export function decrypt(encryptedText) {
    if (!encryptedText)
        return '';
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format');
    }
    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length');
    }
    const decipher = crypto.createDecipheriv(ALGORITHM, masterKeyBuffer, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Never log secrets. Mask keys as AIza****x9f2 everywhere (UI, logs, API responses).
 * Full key is shown only at the moment of pasting.
 */
export function maskKey(key) {
    if (!key)
        return '';
    const clean = key.trim();
    if (clean.length <= 8) {
        return '****';
    }
    const prefix = clean.slice(0, 4);
    const suffix = clean.slice(-4);
    return `${prefix}****${suffix}`;
}
//# sourceMappingURL=crypto.js.map