import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/bootstrap.js';
import { User } from '../db/models/User.js';
import { prisma } from '../db/prisma.js';
export async function authenticateToken(req, res, next) {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }
    if (!token) {
        res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
        return;
    }
    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
        // Verify user is still active in database (Prisma or Mongoose)
        let isUserActive = false;
        if (mongoose.connection.readyState === 1) {
            const userDoc = await User.findById(decoded.id).select('active archivedAt');
            isUserActive = !!userDoc && userDoc.active && !userDoc.archivedAt;
        }
        else {
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { active: true, archivedAt: true },
            });
            isUserActive = !!user && user.active && !user.archivedAt;
        }
        if (!isUserActive) {
            res.status(401).json({ success: false, error: 'User account is inactive or deleted.' });
            return;
        }
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name,
        };
        next();
    }
    catch (err) {
        res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    }
}
//# sourceMappingURL=auth.js.map