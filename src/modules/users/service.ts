import argon2 from 'argon2';
import mongoose from 'mongoose';
import { User, IUser } from '../../db/models/User.js';
import { prisma } from '../../db/prisma.js';
import { CreateUserInput, UpdateUserInput, UserDTO } from '../../shared/index.js';
import { AppError } from '../../services/errors.js';
import { toUserDTO } from '../auth/service.js';

export class UsersService {
  private isMongo(): boolean {
    return mongoose.connection.readyState === 1;
  }

  async listUsers(): Promise<UserDTO[]> {
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

  async createUser(data: CreateUserInput): Promise<UserDTO> {
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

  async updateUser(userId: string, data: UpdateUserInput): Promise<UserDTO> {
    if (!this.isMongo()) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.archivedAt) {
        throw new AppError('User not found', 404);
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email.toLowerCase();
      if (data.role !== undefined) updateData.role = data.role;
      if (data.active !== undefined) updateData.active = data.active;
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
    if (!this.isMongo()) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new AppError('User not found', 404);

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
    if (!user) throw new AppError('User not found', 404);

    user.archivedAt = new Date();
    user.active = false;
    await user.save();
  }

  // ---------------------------------------------------------------------------
  // Real-time Screen Time & Activity Tracking
  // ---------------------------------------------------------------------------
  private static presenceMap = new Map<
    string,
    {
      lastSeen: number;
      activeSecondsToday: number;
      currentPath: string;
      dayKey: string;
      userAgent?: string;
    }
  >();

  /**
   * Record periodic user screen time heartbeat
   */
  recordHeartbeat(userId: string, seconds: number, path?: string, userAgent?: string) {
    const todayKey = new Date().toISOString().slice(0, 10);
    const existing = UsersService.presenceMap.get(userId);

    const safeSeconds = Math.min(Math.max(seconds || 30, 1), 60);

    if (!existing || existing.dayKey !== todayKey) {
      UsersService.presenceMap.set(userId, {
        lastSeen: Date.now(),
        activeSecondsToday: safeSeconds,
        currentPath: path || '/dashboard',
        dayKey: todayKey,
        userAgent,
      });
    } else {
      existing.lastSeen = Date.now();
      existing.activeSecondsToday += safeSeconds;
      if (path) existing.currentPath = path;
      if (userAgent) existing.userAgent = userAgent;
    }
  }

  /**
   * Record lead click/view event by a sales rep or manager
   */
  async recordLeadView(userId: string, leadId: string, leadName?: string) {
    try {
      await prisma.activityLog.create({
        data: {
          actorId: userId,
          action: 'view_lead',
          entity: 'lead',
          entityId: leadId,
          meta: {
            leadName: leadName || 'Lead',
            viewedAt: new Date().toISOString(),
          },
        },
      });
    } catch {}
  }

  /**
   * Get team performance, screen times, and live activity metrics
   */
  async getTeamPerformance() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const users = await prisma.user.findMany({
      where: { archivedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();

    // Query activity logs from today for leads viewed and actions
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [leadViews, leadEvents, tasks] = await Promise.all([
      prisma.activityLog.findMany({
        where: {
          action: 'view_lead',
          createdAt: { gte: todayStart },
        },
        select: { actorId: true, entityId: true },
      }),
      prisma.leadEvent.findMany({
        where: {
          createdAt: { gte: todayStart },
        },
        select: { actorId: true, type: true },
      }),
      prisma.activityLog.findMany({
        where: {
          action: 'task',
          entity: 'task',
        },
        select: { actorId: true, meta: true },
      }),
    ]);

    // Build maps for fast lookups
    const leadViewsCountMap = new Map<string, number>();
    for (const v of leadViews) {
      if (v.actorId) {
        leadViewsCountMap.set(v.actorId, (leadViewsCountMap.get(v.actorId) || 0) + 1);
      }
    }

    const whatsappCountMap = new Map<string, number>();
    const emailCountMap = new Map<string, number>();
    const callCountMap = new Map<string, number>();

    for (const ev of leadEvents) {
      if (!ev.actorId) continue;
      if (ev.type === 'whatsapp') {
        whatsappCountMap.set(ev.actorId, (whatsappCountMap.get(ev.actorId) || 0) + 1);
      } else if (ev.type.startsWith('email')) {
        emailCountMap.set(ev.actorId, (emailCountMap.get(ev.actorId) || 0) + 1);
      } else if (ev.type === 'call') {
        callCountMap.set(ev.actorId, (callCountMap.get(ev.actorId) || 0) + 1);
      }
    }

    const taskCompletedCountMap = new Map<string, number>();
    for (const t of tasks) {
      if (t.actorId) {
        const meta = t.meta as any;
        if (meta?.status === 'completed') {
          taskCompletedCountMap.set(t.actorId, (taskCompletedCountMap.get(t.actorId) || 0) + 1);
        }
      }
    }

    let activeNowCount = 0;
    let totalActiveSeconds = 0;

    const members = await Promise.all(
      users.map(async (u) => {
        const presence = UsersService.presenceMap.get(u.id);
        const isOnline = presence ? now - presence.lastSeen < 120000 : false;
        if (isOnline) activeNowCount++;

        const secondsToday =
          presence && presence.dayKey === todayKey ? presence.activeSecondsToday : 0;
        totalActiveSeconds += secondsToday;

        const hours = Math.floor(secondsToday / 3600);
        const mins = Math.floor((secondsToday % 3600) / 60);
        const screenTimeFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        // Fetch last 3 recent activities
        const recentLogs = await prisma.activityLog.findMany({
          where: { actorId: u.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        const recentActivities = recentLogs.map((l) => {
          const meta = (l.meta as any) || {};
          let description = l.action;
          if (l.action === 'view_lead') description = `Viewed Lead: ${meta.leadName || 'Lead'}`;
          else if (l.action === 'contact_lead') description = `Contacted via ${meta.channel || 'Channel'}`;
          else if (l.action === 'task') description = `Task: ${meta.title || 'Task'}`;
          return {
            id: l.id,
            action: l.action,
            description,
            time: l.createdAt,
          };
        });

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          isOnline,
          lastActive: presence ? new Date(presence.lastSeen).toISOString() : u.lastLoginAt,
          currentPath: presence?.currentPath || null,
          screenTimeSeconds: secondsToday,
          screenTimeFormatted,
          leadsClicked: leadViewsCountMap.get(u.id) || 0,
          whatsappSent: whatsappCountMap.get(u.id) || 0,
          emailsSent: emailCountMap.get(u.id) || 0,
          callsMade: callCountMap.get(u.id) || 0,
          tasksCompleted: taskCompletedCountMap.get(u.id) || 0,
          recentActivities,
        };
      })
    );

    return {
      summary: {
        totalStaff: users.length,
        salesReps: users.filter((u) => u.role === 'sales').length,
        managers: users.filter((u) => u.role === 'manager').length,
        admins: users.filter((u) => u.role === 'admin').length,
        activeNow: activeNowCount,
        totalScreenTimeHours: Math.round((totalActiveSeconds / 3600) * 10) / 10,
      },
      members,
    };
  }

  /**
   * Get detailed activity log for a specific user
   */
  async getUserActivities(targetUserId: string) {
    const logs = await prisma.activityLog.findMany({
      where: { actorId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map((l) => {
      const meta = (l.meta as any) || {};
      let title = l.action;
      if (l.action === 'view_lead') title = `Opened Lead: ${meta.leadName || 'Lead'}`;
      else if (l.action === 'contact_lead') title = `Pitched Lead via ${meta.channel || 'WhatsApp/Email'}`;
      else if (l.action === 'task') title = `Task Action: ${meta.title || 'Task'}`;

      return {
        id: l.id,
        action: l.action,
        title,
        entity: l.entity,
        entityId: l.entityId,
        meta,
        createdAt: l.createdAt,
      };
    });
  }
}

export const usersService = new UsersService();
