import { authService, toUserDTO } from './service.js';
import { User } from '../../db/models/User.js';
import { recordAuditLog, recordActivityLog } from '../../middleware/audit.js';
export class AuthController {
    async login(req, res) {
        const { email, password, twoFactorCode } = req.body;
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await authService.login(email, password, twoFactorCode, ip, userAgent);
        if (result.requires2FA) {
            res.json({
                success: true,
                data: {
                    requires2FA: true,
                    tempToken: result.tempToken,
                    user: result.user,
                },
            });
            return;
        }
        // Set secure httpOnly refresh token cookie
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/',
        });
        await recordActivityLog(result.user.id, 'login', 'user', result.user.id, { ip });
        res.json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    }
    async verify2FALogin(req, res) {
        const { tempToken, code } = req.body;
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await authService.verify2FALogin(tempToken, code, ip, userAgent);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        await recordActivityLog(result.user.id, 'login_2fa', 'user', result.user.id, { ip });
        res.json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    }
    async refresh(req, res) {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const result = await authService.refreshSession(token, ip, userAgent);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: '/',
        });
        res.json({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    }
    async logout(req, res) {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (token) {
            await authService.logout(token);
        }
        if (req.user) {
            await recordActivityLog(req.user.id, 'logout', 'user', req.user.id);
        }
        res.clearCookie('refreshToken', { path: '/' });
        res.json({ success: true, message: 'Logged out successfully' });
    }
    async me(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        res.json({ success: true, data: toUserDTO(user) });
    }
    async setup2FA(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const result = await authService.setup2FA(req.user.id);
        res.json({ success: true, data: result });
    }
    async verify2FA(req, res) {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const { secret, token } = req.body;
        await authService.verifyAndEnable2FA(req.user.id, secret, token);
        await recordAuditLog(req, '2fa_enabled', `User:${req.user.id}`);
        await recordActivityLog(req.user.id, '2fa_enabled', 'user', req.user.id);
        res.json({ success: true, message: 'Two-factor authentication successfully enabled' });
    }
}
export const authController = new AuthController();
//# sourceMappingURL=controller.js.map