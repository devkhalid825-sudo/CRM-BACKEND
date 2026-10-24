import argon2 from 'argon2';
import { User, IUser } from '../../db/models/User.js';
import { CreateUserInput, UpdateUserInput, UserDTO } from '@lead-crm/shared';
import { AppError } from '../../services/errors.js';
import { toUserDTO } from '../auth/service.js';

export class UsersService {
  async listUsers(): Promise<UserDTO[]> {
    const users = await User.find({ archivedAt: null }).sort({ createdAt: -1 });
    return users.map(toUserDTO);
  }

  async createUser(data: CreateUserInput): Promise<UserDTO> {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      if (existing.archivedAt) {
        // Restore previously deleted user
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
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      active: true,
      twoFactor: { enabled: false },
    });

    return toUserDTO(created);
  }

  async updateUser(userId: string, data: UpdateUserInput): Promise<UserDTO> {
    const user = await User.findById(userId);
    if (!user || user.archivedAt) {
      throw new AppError('User not found', 404);
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.email !== undefined) user.email = data.email.toLowerCase();
    if (data.role !== undefined) user.role = data.role;
    if (data.active !== undefined) user.active = data.active;
    if (data.password) {
      user.passwordHash = await argon2.hash(data.password);
    }

    await user.save();
    return toUserDTO(user);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    // Soft delete
    user.archivedAt = new Date();
    user.active = false;
    await user.save();
  }
}

export const usersService = new UsersService();
