import { CreateUserInput, UpdateUserInput, UserDTO } from '../../shared/index.js';
export declare class UsersService {
    private isMongo;
    listUsers(): Promise<UserDTO[]>;
    createUser(data: CreateUserInput): Promise<UserDTO>;
    updateUser(userId: string, data: UpdateUserInput): Promise<UserDTO>;
    deleteUser(userId: string): Promise<void>;
    private static presenceMap;
    /**
     * Record periodic user screen time heartbeat
     */
    recordHeartbeat(userId: string, seconds: number, path?: string, userAgent?: string): void;
    /**
     * Record lead click/view event by a sales rep or manager
     */
    recordLeadView(userId: string, leadId: string, leadName?: string): Promise<void>;
    /**
     * Get team performance, screen times, and live activity metrics
     */
    getTeamPerformance(): Promise<{
        summary: {
            totalStaff: number;
            salesReps: number;
            managers: number;
            admins: number;
            activeNow: number;
            totalScreenTimeHours: number;
        };
        members: {
            id: string;
            name: string;
            email: string;
            role: string;
            active: boolean;
            isOnline: boolean;
            lastActive: string | Date | null;
            currentPath: string | null;
            screenTimeSeconds: number;
            screenTimeFormatted: string;
            leadsClicked: number;
            whatsappSent: number;
            emailsSent: number;
            callsMade: number;
            tasksCompleted: number;
            recentActivities: {
                id: string;
                action: string;
                description: string;
                time: Date;
            }[];
        }[];
    }>;
    /**
     * Get detailed activity log for a specific user
     */
    getUserActivities(targetUserId: string): Promise<{
        id: string;
        action: string;
        title: string;
        entity: string;
        entityId: string | null;
        meta: any;
        createdAt: Date;
    }[]>;
}
export declare const usersService: UsersService;
//# sourceMappingURL=service.d.ts.map