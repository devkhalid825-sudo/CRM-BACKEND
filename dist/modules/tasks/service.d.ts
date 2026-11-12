export interface CreateTaskInput {
    title: string;
    assignedTo: string;
    leadId?: string;
    dueDate?: string;
    priority?: 'urgent' | 'high' | 'normal';
    notes?: string;
}
export declare class TasksService {
    /**
     * List tasks based on user role:
     * Admins and managers see all team tasks.
     * Sales reps see tasks assigned to them.
     */
    listTasks(currentUserId: string, currentUserRole: string, filterAssignee?: string): Promise<{
        id: string;
        title: any;
        status: any;
        priority: any;
        dueDate: any;
        notes: any;
        leadId: any;
        leadName: any;
        leadCity: string | null;
        assignedTo: string | null;
        assigneeName: string;
        assigneeEmail: string;
        assignedBy: any;
        assignedByName: any;
        createdAt: Date;
        completedAt: any;
    }[]>;
    /**
     * Create a new task and notify the assigned rep
     */
    createTask(creatorId: string, creatorName: string, input: CreateTaskInput): Promise<{
        title: string;
        status: string;
        priority: "normal" | "urgent" | "high";
        dueDate: string | null;
        notes: string;
        leadId: string | null;
        leadName: string;
        assignedBy: string;
        assignedByName: string;
        id: string;
    }>;
    /**
     * Update task status (toggle pending / completed)
     */
    updateStatus(taskId: string, status: 'pending' | 'completed', userId: string): Promise<{
        id: string;
        status: "pending" | "completed";
    }>;
    /**
     * Delete task
     */
    deleteTask(taskId: string): Promise<{
        success: boolean;
    }>;
}
export declare const tasksService: TasksService;
//# sourceMappingURL=service.d.ts.map