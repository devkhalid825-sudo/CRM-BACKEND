import argon2 from 'argon2';
import mongoose from 'mongoose';
import { User } from '../../db/models/User.js';
import { prisma } from '../../db/prisma.js';
import { AppError } from '../../services/errors.js';
import { toUserDTO } from '../auth/service.js';
export class UsersService {
    isMongo() {
        return mongoose.connection.readyState === 1;
    }
    async listUsers() {
        if (!this.isMongo()) {
            const users = await prisma.user.findMany({
                where: { archivedAt: null },
                orderBy: { createdAt: 'desc' },
            });
            return users.map(toUserDTO);
        }
        const users = await User.find({ archivedAt: null }).sort({ createdAt: -1 });
        return users.map(toUserDTO);
    }
    async createUser(data) {
        const cleanEmail = data.email.toLowerCase().trim();
        if (!this.isMongo()) {
            const existing = await prisma.user.findFirst({
                where: { email: cleanEmail },
            });
            if (existing) {
                if (existing.archivedAt) {
                    const passwordHash = await argon2.hash(data.password);
                    const restored = await prisma.user.update({
                        where: { id: existing.id },
                        data: {
                            name: data.name,
                            passwordHash,
                            role: data.role,
                            active: true,
                            archivedAt: null,
                        },
                    });
                    return toUserDTO(restored);
                }
                throw new AppError('A user with this email already exists', 400);
            }
            const passwordHash = await argon2.hash(data.password);
            const created = await prisma.user.create({
                data: {
                    name: data.name,
                    email: cleanEmail,
                    passwordHash,
                    role: data.role,
                    active: true,
                    twoFactorEnabled: false,
                },
            });
            return toUserDTO(created);
        }
        const existing = await User.findOne({ email: cleanEmail });
        if (existing) {
            if (existing.archivedAt) {
                existing.name = data.name;
                existing.passwordHash = await argon2.hash(data.password);
                existing.role = data.role;
                existing.active = true;
                existing.archivedAt = null;
                await existing.save();
                return toUserDTO(existing);
            }
            throw new AppError('A user with this email already exists', 400);
        }
        const passwordHash = await argon2.hash(data.password);
        const created = await User.create({
            name: data.name,
            email: cleanEmail,
            passwordHash,
            role: data.role,
            active: true,
            twoFactor: { enabled: false },
        });
        return toUserDTO(created);
    }
    async updateUser(userId, data) {
        if (!this.isMongo()) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || user.archivedAt) {
                throw new AppError('User not found', 404);
            }
            const updateData = {};
            if (data.name !== undefined)
                updateData.name = data.name;
            if (data.email !== undefined)
                updateData.email = data.email.toLowerCase();
            if (data.role !== undefined)
                updateData.role = data.role;
            if (data.active !== undefined)
                updateData.active = data.active;
            if (data.password) {
                updateData.passwordHash = await argon2.hash(data.password);
            }
            const updated = await prisma.user.update({
                where: { id: userId },
                data: updateData,
            });
            return toUserDTO(updated);
        }
        const user = await User.findById(userId);
        if (!user || user.archivedAt) {
            throw new AppError('User not found', 404);
        }
        if (data.name !== undefined)
            user.name = data.name;
        if (data.email !== undefined)
            user.email = data.email.toLowerCase();
        if (data.role !== undefined)
            user.role = data.role;
        if (data.active !== undefined)
            user.active = data.active;
        if (data.password) {
            user.passwordHash = await argon2.hash(data.password);
        }
        await user.save();
        return toUserDTO(user);
    }
    async deleteUser(userId) {
        if (!this.isMongo()) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new AppError('User not found', 404);
            await prisma.user.update({
                where: { id: userId },
                data: {
                    archivedAt: new Date(),
                    active: false,
                },
            });
            return;
        }
        const user = await User.findById(userId);
        if (!user)
            throw new AppError('User not found', 404);
        user.archivedAt = new Date();
        user.active = false;
        await user.save();
    }
}
export const usersService = new UsersService();
//# sourceMappingURL=service.js.map