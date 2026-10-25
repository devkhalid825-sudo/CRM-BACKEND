/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns string formatted as: iv:authTag:encryptedText (in hex)
 */
export declare function encrypt(text: string): string;
/**
 * Decrypt an AES-256-GCM encrypted string (format iv:authTag:encryptedText)
 */
export declare function decrypt(encryptedText: string): string;
/**
 * Never log secrets. Mask keys as AIza****x9f2 everywhere (UI, logs, API responses).
 * Full key is shown only at the moment of pasting.
 */
export declare function maskKey(key: string): string;
//# sourceMappingURL=crypto.d.ts.map