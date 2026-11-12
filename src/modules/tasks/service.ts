import { prisma } from '../../db/prisma.js';
import { logger } from '../../services/logger.js';

export interface CreateTaskInput {
  title: string;
  assignedTo: string;
  leadId?: string;
  dueDate?: string;
  priority?: 'urgent' | 'high' | 'normal';
  notes?: string;
}

export class TasksService {
  /**
   * List tasks based on user role:
   * Admins and managers see all team tasks.
   * Sales reps see tasks assigned to them.
   */
  async listTasks(currentUserId: string, currentUserRole: string, filterAssignee?: string) {
    const isManagerOrAdmin = currentUserRole === 'admin' || currentUserRole === 'manager';

    const where: any = {
      action: 'task',
      entity: 'task',
    };

    if (filterAssignee) {
      where.actorId = filterAssignee;
    } else if (!isManagerOrAdmin) {
      // Sales reps only see their own assigned tasks
      where.actorId = currentUserId;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Populate user and lead details
    const userIds = new Set<string>();
    const leadIds = new Set<string>();

    for (const log of logs) {
      if (log.actorId) userIds.add(log.actorId);
      const meta = log.meta as any;
      if (meta?.assignedBy) userIds.add(meta.assignedBy);
      if (meta?.leadId) leadIds.add(meta.leadId);
    }

    const [users, leads] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.lead.findMany({
        where: { id: { in: Array.from(leadIds) } },
        select: { id: true, name: true, city: true, phoneNorm: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const leadMap = new Map(leads.map((l) => [l.id, l]));

    return logs.map((log) => {
      const meta = (log.meta as any) || {};
      const assignee = log.actorId ? userMap.get(log.actorId) : null;
      const creator = meta.assignedBy ? userMap.get(meta.assignedBy) : null;
      const lead = meta.leadId ? leadMap.get(meta.leadId) : null;

      return {
        id: log.id,
        title: meta.title || 'Untitled Task',
        status: meta.status || 'pending',
        priority: meta.priority || 'normal',
        dueDate: meta.dueDate || null,
        notes: meta.notes || '',
        leadId: meta.leadId || null,
        leadName: lead?.name || meta.leadName || null,
        leadCity: lead?.city || null,
        assignedTo: log.actorId,
        assigneeName: assignee?.name || 'Unassigned',
        assigneeEmail: assignee?.email || '',
        assignedBy: meta.assignedBy,
        assignedByName: creator?.name || meta.assignedByName || 'Manager',
        createdAt: log.createdAt,
        completedAt: meta.completedAt || null,
      };
    });
  }

  /**
   * Create a new task and notify the assigned rep
   */
  async createTask(creatorId: string, creatorName: string, input: CreateTaskInput) {
    let leadName = '';
    if (input.leadId) {
      const lead = await prisma.lead.findUnique({ where: { id: input.leadId }, select: { name: true } });
      leadName = lead?.name || '';
    }

    const assignee = await prisma.user.findUnique({
      where: { id: input.assignedTo },
      select: { id: true, name: true },
    });

    const meta = {
      title: input.title,
      status: 'pending',
      priority: input.priority || 'normal',
      dueDate: input.dueDate || null,
      notes: input.notes || '',
      leadId: input.leadId || null,
      leadName,
      assignedBy: creatorId,
      assignedByName: creatorName,
    };

    const taskLog = await prisma.activityLog.create({
      data: {
        actorId: input.assignedTo,
        action: 'task',
        entity: 'task',
        entityId: input.leadId || null,
        meta,
      },
    });

    // Send in-app notification to the assigned user
    try {
      await prisma.notification.create({
        data: {
          userId: input.assignedTo,
          type: 'task_assigned',
          title: `New Task: ${input.title} (Assigned by ${creatorName})`,
          link: input.leadId ? `/leads/${input.leadId}` : '/dashboard',
        },
      });
    } catch (err: any) {
      logger.warn('tasks', `Failed to create notification: ${err.message}`);
    }

    // If attached to a lead, log to lead timeline
    if (input.leadId) {
      try {
        await prisma.leadEvent.create({
          data: {
            leadId: input.leadId,
            type: 'task_created',
            actorId: creatorId,
            actorName: creatorName,
            payload: {
              taskId: taskLog.id,
              title: input.title,
              assignedTo: assignee?.name || 'Team Member',
              priority: input.priority || 'normal',
              dueDate: input.dueDate,
            },
          },
        });
      } catch (err: any) {
        logger.warn('tasks', `Failed to log task to lead timeline: ${err.message}`);
      }
    }

    return { id: taskLog.id, ...meta };
  }

  /**
   * Update task status (toggle pending / completed)
   */
  async updateStatus(taskId: string, status: 'pending' | 'completed', userId: string) {
    const taskLog = await prisma.activityLog.findUnique({ where: { id: taskId } });
    if (!taskLog) throw new Error('Task not found');

    const meta = (taskLog.meta as any) || {};
    meta.status = status;
    meta.completedAt = status === 'completed' ? new Date().toISOString() : null;
    meta.completedBy = userId;

    await prisma.activityLog.update({
      where: { id: taskId },
      data: { meta },
    });

    return { id: taskId, status };
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string) {
    await prisma.activityLog.delete({ where: { id: taskId } });
    return { success: true };
  }
}

export const tasksService = new TasksService();
