import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import mongoose from 'mongoose';
import { env } from '../../config/bootstrap.js';
import { User } from '../../db/models/User.js';
import { Session } from '../../db/models/Session.js';
import { prisma } from '../../db/prisma.js';
import { encrypt, decrypt } from '../../services/crypto.js';
import { AppError } from '../../services/errors.js';
export function toUserDTO(user) {
    return {
        id: user.id || user._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        twoFactorEnabled: user.twoFactorEnabled !== undefined ? user.twoFactorEnabled : !!user.twoFactor?.enabled,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    };
}
export class AuthService {
    isMongo() {
        return mongoose.connection.readyState === 1;
    }
    /**
     * Login user with email, password, and optional 2FA code.
     * Seamlessly queries AWS SQL Database (Prisma) or MongoDB.
     */
    async login(email, pass, twoFactorCode, ip, userAgent) {
        const cleanEmail = email.toLowerCase().trim();
        let user = null;
        const useMongo = this.isMongo();
        if (!useMongo) {
            // 1. Prisma (AWS SQL / PostgreSQL) Mode
            let userCount = 0;
            try {
                userCount = await prisma.user.count();
            }
            catch (err) {
                console.warn('Prisma query warning:', err);
            }
            // Auto-seed first administrator account if database is completely empty
            if (userCount === 0 && cleanEmail === 'admin@crm.local') {
                const passwordHash = await argon2.hash('AdminPass123!');
                user = await prisma.user.create({
                    data: {
                        name: 'System Administrator',
                        email: 'admin@crm.local',
                        passwordHash,
                        role: 'admin',
                        active: true,
                        twoFactorEnabled: false,
                    },
                });
                console.log('✅ Auto-created initial administrator user in SQL Database: admin@crm.local');
            }
            else {
                user = await prisma.user.findFirst({
                    where: {
                        email: cleanEmail,
                        archivedAt: null,
                    },
                });
            }
        }
        else {
            // 2. Mongoose (MongoDB) Mode
            user = await User.findOne({ email: cleanEmail, archivedAt: null });
        }
        if (!user) {
            throw new AppError('Invalid email or password', 401);
        }
        if (!user.active) {
            throw new AppError('Account is disabled. Please contact an administrator.', 403);
        }
        const isValidPassword = await argon2.verify(user.passwordHash, pass);
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401);
        }
        // Check 2FA requirement
        const has2FA = user.twoFactorEnabled !== undefined ? user.twoFactorEnabled : !!user.twoFactor?.enabled;
        const secretEnc = user.twoFactorSecretEnc || user.twoFactor?.secretEnc;
        if (has2FA && secretEnc) {
            const userId = user.id || user._id.toString();
            if (!twoFactorCode) {
                // Issue temporary 2FA token valid for 5 minutes
                const tempToken = jwt.sign({ id: userId, type: '2fa_pending' }, env.JWT_ACCESS_SECRET, { expiresIn: '5m' });
                return {
                    user: toUserDTO(user),
                    accessToken: '',
                    refreshToken: '',
                    requires2FA: true,
                    tempToken,
                };
            }
            // Verify 2FA code
            const secret = decrypt(secretEnc);
            const isValid2FA = authenticator.verify({
                token: twoFactorCode,
                secret,
            });
            if (!isValid2FA) {
                throw new AppError('Invalid 2FA code', 401);
            }
        }
        // Complete login: issue access and refresh tokens
        const { accessToken, refreshToken } = await this.issueTokens(user, ip, userAgent);
        if (!useMongo) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });
        }
        else {
            user.lastLoginAt = new Date();
            await user.save();
        }
        return {
            user: toUserDTO(user),
            accessToken,
            refreshToken,
        };
    }
    /**
     * Complete 2FA login verification with tempToken
     */
    async verify2FALogin(tempToken, code, ip, userAgent) {
        try {
            const decoded = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
            if (decoded.type !== '2fa_pending') {
                throw new AppError('Invalid 2FA verification request', 400);
            }
            let user = null;
            const useMongo = this.isMongo();
            if (!useMongo) {
                user = await prisma.user.findUnique({ where: { id: decoded.id } });
            }
            else {
                user = await User.findById(decoded.id);
            }
            const has2FA = user?.twoFactorEnabled !== undefined ? user.twoFactorEnabled : !!user?.twoFactor?.enabled;
            const secretEnc = user?.twoFactorSecretEnc || user?.twoFactor?.secretEnc;
            if (!user || !has2FA || !secretEnc) {
                throw new AppError('User not found or 2FA not enabled', 404);
            }
            const secret = decrypt(secretEnc);
            const isValid = authenticator.verify({ token: code, secret });
            if (!isValid) {
                throw new AppError('Invalid 2FA code', 401);
            }
            const { accessToken, refreshToken } = await this.issueTokens(user, ip, userAgent);
            if (!useMongo) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { lastLoginAt: new Date() },
                });
            }
            else {
                user.lastLoginAt = new Date();
                await user.save();
            }
            return {
                user: toUserDTO(user),
                accessToken,
                refreshToken,
            };
        }
        catch (err) {
            if (err instanceof AppError)
                throw err;
            throw new AppError('Invalid or expired 2FA session', 401);
        }
    }
    /**
     * Issue 15m access token and 30d refresh token session
     */
    async issueTokens(user, ip, userAgent) {
        const userId = user.id || user._id?.toString();
        const accessToken = jwt.sign({
            id: userId,
            email: user.email,
            role: user.role,
            name: user.name,
        }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
        const rawRefreshToken = crypto.randomBytes(40).toString('hex');
        const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        if (!this.isMongo()) {
            await prisma.session.create({
                data: {
                    userId,
                    refreshTokenHash,
                    ip: ip || null,
                    userAgent: userAgent || null,
                    expiresAt,
                },
            });
        }
        else {
            await Session.create({
                userId,
                refreshTokenHash,
                ip,
                userAgent,
                expiresAt,
            });
        }
        return { accessToken, refreshToken: rawRefreshToken };
    }
    /**
     * Rotate refresh token and issue new access token
     */
    async refreshSession(rawRefreshToken, ip, userAgent) {
        if (!rawRefreshToken) {
            throw new AppError('Refresh token required', 401);
        }
        const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        const useMongo = this.isMongo();
        if (!useMongo) {
            const session = await prisma.session.findFirst({
                where: {
                    refreshTokenHash: hash,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
            });
            if (!session) {
                throw new AppError('Invalid or expired refresh token session', 401);
            }
            const user = await prisma.user.findUnique({ where: { id: session.userId } });
            if (!user || !user.active || user.archivedAt) {
                await prisma.session.update({
                    where: { id: session.id },
                    data: { revokedAt: new Date() },
                });
                throw new AppError('User account is inactive', 403);
            }
            // Revoke old session and issue new token pair
            await prisma.session.update({
                where: { id: session.id },
                data: { revokedAt: new Date() },
            });
            const tokens = await this.issueTokens(user, ip, userAgent);
            return {
                ...tokens,
                user: toUserDTO(user),
            };
        }
        else {
            const session = await Session.findOne({
                refreshTokenHash: hash,
                revokedAt: null,
                expiresAt: { $gt: new Date() },
            });
            if (!session) {
                throw new AppError('Invalid or expired refresh token session', 401);
            }
            const user = await User.findById(session.userId);
            if (!user || !user.active || user.archivedAt) {
                session.revokedAt = new Date();
                await session.save();
                throw new AppError('User account is inactive', 403);
            }
            session.revokedAt = new Date();
            await session.save();
            const tokens = await this.issueTokens(user, ip, userAgent);
            return {
                ...tokens,
                user: toUserDTO(user),
            };
        }
    }
    /**
     * Logout: revoke session
     */
    async logout(rawRefreshToken) {
        if (!rawRefreshToken)
            return;
        const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
        if (!this.isMongo()) {
            await prisma.session.updateMany({
                where: { refreshTokenHash: hash },
                data: { revokedAt: new Date() },
            });
        }
        else {
            await Session.updateOne({ refreshTokenHash: hash }, { revokedAt: new Date() });
        }
    }
    /**
     * Setup 2FA: generates secret and QR code data URL
     */
    async setup2FA(userId) {
        let email = '';
        if (!this.isMongo()) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new AppError('User not found', 404);
            email = user.email;
        }
        else {
            const user = await User.findById(userId);
            if (!user)
                throw new AppError('User not found', 404);
            email = user.email;
        }
        const secret = authenticator.generateSecret();
        const otpauthUrl = authenticator.keyuri(email, 'Global Lead CRM', secret);
        const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
        return { secret, qrCodeDataUrl };
    }
    /**
     * Verify and activate 2FA
     */
    async verifyAndEnable2FA(userId, secret, token) {
        const isValid = authenticator.verify({ token, secret });
        if (!isValid) {
            throw new AppError('Invalid verification code. Please check your authenticator app.', 400);
        }
        if (!this.isMongo()) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    twoFactorEnabled: true,
                    twoFactorSecretEnc: encrypt(secret),
                },
            });
        }
        else {
            const user = await User.findById(userId);
            if (!user)
                throw new AppError('User not found', 404);
            user.twoFactor = {
                enabled: true,
                secretEnc: encrypt(secret),
            };
            await user.save();
        }
    }
}
export const authService = new AuthService();
//# sourceMappingURL=service.js.map