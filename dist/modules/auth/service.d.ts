import mongoose from 'mongoose';
import { IUser } from '../../db/models/User.js';
import { UserDTO, AuthResponse } from '../../shared/index.js';
export declare function toUserDTO(user: any): UserDTO;
export declare class AuthService {
    private isMongo;
    /**
     * Login user with email, password, and optional 2FA code.
     * Seamlessly queries AWS SQL Database (Prisma) or MongoDB.
     */
    login(email: string, pass: string, twoFactorCode?: string, ip?: string, userAgent?: string): Promise<AuthResponse & {
        refreshToken: string;
    }>;
    /**
     * Complete 2FA login verification with tempToken
     */
    verify2FALogin(tempToken: string, code: string, ip?: string, userAgent?: string): Promise<AuthResponse & {
        refreshToken: string;
    }>;
    /**
     * Issue 15m access token and 30d refresh token session
     */
    issueTokens(user: any, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Rotate refresh token and issue new access token
     */
    refreshSession(rawRefreshToken: string, ip?: string, userAgent?: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: UserDTO;
    }>;
    /**
     * Logout: revoke session
     */
    logout(rawRefreshToken: string): Promise<void>;
    /**
     * Get user by ID (supports both Prisma SQL and MongoDB)
     */
    getUserById(userId: string): Promise<(mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }) | {
        email: string;
        name: string;
        role: string;
        active: boolean;
        passwordHash: string;
        lastLoginAt: Date | null;
        archivedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        twoFactorEnabled: boolean;
        twoFactorSecretEnc: string | null;
    } | null>;
    /**
     * Setup 2FA: generates secret and QR code data URL
     */
    setup2FA(userId: string): Promise<{
        secret: string;
        qrCodeDataUrl: string;
    }>;
    /**
     * Verify and activate 2FA
     */
    verifyAndEnable2FA(userId: string, secret: string, token: string): Promise<void>;
}
export declare const authService: AuthService;
//# sourceMappingURL=service.d.ts.map