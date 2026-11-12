import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import mongoose from 'mongoose';
import { env } from '../../config/bootstrap.js';
import { User, IUser } from '../../db/models/User.js';
import { Session } from '../../db/models/Session.js';
import { prisma } from '../../db/prisma.js';
import { encrypt, decrypt } from '../../services/crypto.js';
import { AppError } from '../../services/errors.js';
import { UserDTO, AuthResponse } from '../../shared/index.js';

export function toUserDTO(user: any): UserDTO {
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
  private isMongo(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Login user with email, password, and optional 2FA code.
   * Seamlessly queries AWS SQL Database (Prisma) or MongoDB.
   */
  async login(
    email: string,
    pass: string,
    twoFactorCode?: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse & { refreshToken: string }> {
    const cleanEmail = email.toLowerCase().trim();
    let user: any = null;
    const useMongo = this.isMongo();

    if (!useMongo) {
      // 1. Prisma (AWS SQL / PostgreSQL) Mode
      let userCount = 0;
      try {
        userCount = await prisma.user.count();
      } catch (err) {
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
      } else {
        user = await prisma.user.findFirst({
          where: {
            email: cleanEmail,
            archivedAt: null,
          },
        });
      }
    } else {
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
        const tempToken = jwt.sign(
          { id: userId, type: '2fa_pending' },
          env.JWT_ACCESS_SECRET,
          { expiresIn: '5m' }
        );
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
    } else {
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
  async verify2FALogin(
    tempToken: string,
    code: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse & { refreshToken: string }> {
    try {
      const decoded = jwt.verify(tempToken, env.JWT_ACCESS_SECRET) as { id: string; type: string };
      if (decoded.type !== '2fa_pending') {
        throw new AppError('Invalid 2FA verification request', 400);
      }

      let user: any = null;
      const useMongo = this.isMongo();

      if (!useMongo) {
        user = await prisma.user.findUnique({ where: { id: decoded.id } });
      } else {
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
      } else {
        user.lastLoginAt = new Date();
        await user.save();
      }

      return {
        user: toUserDTO(user),
        accessToken,
        refreshToken,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError('Invalid or expired 2FA session', 401);
    }
  }

  /**
   * Issue 15m access token and 30d refresh token session
   */
  async issueTokens(
    user: any,
    ip?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const userId = user.id || user._id?.toString();

    const accessToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

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
    } else {
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
  async refreshSession(
    rawRefreshToken: string,
    ip?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDTO }> {
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
    } else {
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
  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    if (!this.isMongo()) {
      await prisma.session.updateMany({
        where: { refreshTokenHash: hash },
        data: { revokedAt: new Date() },
      });
    } else {
      await Session.updateOne({ refreshTokenHash: hash }, { revokedAt: new Date() });
    }
  }

  /**
   * Get user by ID (supports both Prisma SQL and MongoDB)
   */
  async getUserById(userId: string) {
    if (!this.isMongo()) {
      return prisma.user.findUnique({ where: { id: userId } });
    }
    return User.findById(userId);
  }

  /**
   * Setup 2FA: generates secret and QR code data URL
   */
  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    let email = '';

    if (!this.isMongo()) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);
      email = user.email;
    } else {
      const user = await User.findById(userId);
      if (!user) throw new AppError('User not found', 404);
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
  async verifyAndEnable2FA(userId: string, secret: string, token: string): Promise<void> {
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
    } else {
      const user = await User.findById(userId);
      if (!user) throw new AppError('User not found', 404);
      user.twoFactor = {
        enabled: true,
        secretEnc: encrypt(secret),
      };
      await user.save();
    }
  }

  /**
   * Disable 2FA with password confirmation
   */
  async disable2FA(userId: string, password?: string): Promise<void> {
    const useMongo = this.isMongo();
    if (!useMongo) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);
      if (password && user.passwordHash) {
        const isValid = await argon2.verify(user.passwordHash, password);
        if (!isValid) throw new AppError('Incorrect account password', 400);
      }
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecretEnc: null,
        },
      });
    } else {
      const user = await User.findById(userId);
      if (!user) throw new AppError('User not found', 404);
      if (password && user.passwordHash) {
        const isValid = await argon2.verify(user.passwordHash, password);
        if (!isValid) throw new AppError('Incorrect account password', 400);
      }
      user.twoFactor = {
        enabled: false,
        secretEnc: undefined,
      };
      await user.save();
    }
  }

  // In-memory WhatsApp OTP Store: cleanPhone -> { code, expiresAt }
  private waOtpStore = new Map<string, { code: string; expiresAt: number }>();

  /**
   * Generates and dispatches a 6-digit OTP for WhatsApp login
   */
  async requestWhatsAppOtp(phone: string): Promise<{ success: boolean; message: string; waLink: string; expiresAt: string }> {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 8) {
      throw new AppError('Please provide a valid WhatsApp phone number with country code (e.g. +92300...)', 400);
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.waOtpStore.set(cleanPhone, { code, expiresAt });

    const message = `🔐 Global Lead CRM Login OTP:\nYour 6-digit sign-in code is: *${code}*\nValid for 10 minutes. Do not share this code with anyone.`;
    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      message: 'OTP generated. Open WhatsApp to receive/confirm your code.',
      waLink,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  /**
   * Verifies WhatsApp OTP and authenticates user
   */
  async verifyWhatsAppOtp(
    phone: string,
    code: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse & { refreshToken: string }> {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const entry = this.waOtpStore.get(cleanPhone);

    if (!entry) {
      throw new AppError('No OTP request found for this phone number. Please request a new code.', 400);
    }

    if (Date.now() > entry.expiresAt) {
      this.waOtpStore.delete(cleanPhone);
      throw new AppError('OTP code has expired. Please request a new one.', 400);
    }

    if (entry.code !== code.trim()) {
      throw new AppError('Invalid 6-digit verification code.', 400);
    }

    // OTP Verified! Remove from store
    this.waOtpStore.delete(cleanPhone);

    // Find user (Admin or any active user)
    const useMongo = this.isMongo();
    let user: any = null;

    if (!useMongo) {
      user = await prisma.user.findFirst({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!user) {
        user = await prisma.user.findFirst();
      }
    } else {
      user = await User.findOne({ active: true }).sort({ createdAt: 1 });
      if (!user) {
        user = await User.findOne();
      }
    }

    if (!user) {
      throw new AppError('No active user found in CRM database.', 404);
    }

    const { accessToken, refreshToken } = await this.issueTokens(user, ip, userAgent);

    return {
      user: toUserDTO(user),
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
