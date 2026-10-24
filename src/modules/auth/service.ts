import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { env } from '../../config/bootstrap.js';
import { User, IUser } from '../../db/models/User.js';
import { Session } from '../../db/models/Session.js';
import { encrypt, decrypt } from '../../services/crypto.js';
import { AppError } from '../../services/errors.js';
import { UserDTO, AuthResponse } from '../../shared/index.js';

export function toUserDTO(user: IUser): UserDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    twoFactorEnabled: !!user.twoFactor?.enabled,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  /**
   * Login user with email, password, and optional 2FA code
   */
  async login(
    email: string,
    pass: string,
    twoFactorCode?: string,
    ip?: string,
    userAgent?: string
  ): Promise<AuthResponse & { refreshToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase(), archivedAt: null });
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
    if (user.twoFactor?.enabled) {
      if (!twoFactorCode) {
        // Issue temporary 2FA token valid for 5 minutes
        const tempToken = jwt.sign(
          { id: user._id.toString(), type: '2fa_pending' },
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
      const secret = decrypt(user.twoFactor.secretEnc || '');
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
    user.lastLoginAt = new Date();
    await user.save();

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

      const user = await User.findById(decoded.id);
      if (!user || !user.twoFactor?.enabled) {
        throw new AppError('User not found or 2FA not enabled', 404);
      }

      const secret = decrypt(user.twoFactor.secretEnc || '');
      const isValid = authenticator.verify({ token: code, secret });
      if (!isValid) {
        throw new AppError('Invalid 2FA code', 401);
      }

      const { accessToken, refreshToken } = await this.issueTokens(user, ip, userAgent);
      user.lastLoginAt = new Date();
      await user.save();

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
    user: IUser,
    ip?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = jwt.sign(
      {
        id: user._id.toString(),
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

    await Session.create({
      userId: user._id,
      refreshTokenHash,
      ip,
      userAgent,
      expiresAt,
    });

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

    // Revoke old session and issue new token pair (rotation)
    session.revokedAt = new Date();
    await session.save();

    const tokens = await this.issueTokens(user, ip, userAgent);
    return {
      ...tokens,
      user: toUserDTO(user),
    };
  }

  /**
   * Logout: revoke session
   */
  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;
    const hash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    await Session.updateOne({ refreshTokenHash: hash }, { revokedAt: new Date() });
  }

  /**
   * Setup 2FA: generates secret and QR code data URL
   */
  async setup2FA(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'Global Lead CRM', secret);
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    return { secret, qrCodeDataUrl };
  }

  /**
   * Verify and activate 2FA
   */
  async verifyAndEnable2FA(userId: string, secret: string, token: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      throw new AppError('Invalid verification code. Please check your authenticator app.', 400);
    }

    user.twoFactor = {
      enabled: true,
      secretEnc: encrypt(secret),
    };
    await user.save();
  }
}

export const authService = new AuthService();
