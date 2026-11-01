export interface OverviewMetrics {
    totalLeads: number;
    pipeline: Record<string, number>;
    conversionRate: number;
    totalCalls: number;
    totalNotes: number;
    leadsThisWeek: number;
    sources: Record<string, number>;
}
export interface GeoDistribution {
    country: string;
    count: number;
    cities: Array<{
        city: string;
        count: number;
    }>;
}
export interface CategoryDistribution {
    category: string;
    count: number;
}
export interface AgentPerformance {
    userId: string;
    name: string;
    email: string;
    leadsAssigned: number;
    wonCount: number;
    callsCount: number;
}
export declare class ReportsService {
    /**
     * Get high-level CRM conversion and pipeline statistics
     */
    getOverview(): Promise<OverviewMetrics>;
    /**
     * Leads geographical distribution (Countries & Cities)
     */
    getGeoDistribution(): Promise<GeoDistribution[]>;
    /**
     * Leads distribution by Category
     */
    getCategoryDistribution(): Promise<CategoryDistribution[]>;
    /**
     * Sales agent leaderboard & performance metrics
     */
    getAgentPerformance(): Promise<AgentPerformance[]>;
}
export declare const reportsService: ReportsService;
//# sourceMappingURL=service.d.ts.map