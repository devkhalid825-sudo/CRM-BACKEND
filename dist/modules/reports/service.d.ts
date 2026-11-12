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
    role: string;
    leadsAssigned: number;
    leadsScraped: number;
    whatsappCount: number;
    callsCount: number;
    emailsCount: number;
    meetingsBooked: number;
    wonCount: number;
    activeMinutesToday: number;
    isOnline: boolean;
    lastActiveAt?: string | null;
}
export declare class ReportsService {
    /**
     * Record periodic active heartbeat from logged-in agent
     */
    recordHeartbeat(userId: string): Promise<void>;
    /**
     * Google Ads campaigns, spend & offline conversion metrics
     */
    getGoogleAdsMetrics(): Promise<{
        connected: boolean;
        customerId: string;
        accountName: string;
        currency: string;
        totalSpend: number;
        totalClicks: number;
        impressions: number;
        averageCpc: number;
        ctr: string;
        conversionsTracked: number;
        costPerAcquisition: number;
        campaigns: {
            id: string;
            name: string;
            status: string;
            budgetDaily: number;
            spend: number;
            clicks: number;
            impressions: number;
            conversions: number;
            cpl: number;
        }[];
    }>;
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
     * Sales agent & team leaderboard with active hours, WhatsApp sent, leads scraped, calls & conversions
     */
    getAgentPerformance(): Promise<AgentPerformance[]>;
}
export declare const reportsService: ReportsService;
//# sourceMappingURL=service.d.ts.map