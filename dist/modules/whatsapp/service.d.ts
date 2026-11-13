export declare class WhatsAppService {
    /**
     * Get current session status for a specific user
     */
    getStatus(userId: string): Promise<{
        status: string;
        phone: null;
        qrCodeUrl: null;
        name?: undefined;
    } | {
        status: "connected" | "disconnected" | "connecting";
        phone: string | null;
        name: string | null;
        qrCodeUrl: string | null;
    }>;
    /**
     * Start WhatsApp session and return QR code
     */
    startSession(userId: string): Promise<{
        status: string;
        qrCodeUrl: string | null;
        phone?: string | null;
    }>;
    /**
     * Log out / disconnect WhatsApp session
     */
    disconnect(userId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Send a single direct text message
     */
    sendMessage(userId: string, rawPhone: string, text: string, leadId?: string): Promise<{
        success: boolean;
        phone: string;
    }>;
    /**
     * Send bulk broadcast messages with anti-ban delay pacing
     */
    sendBulkBroadcast(userId: string, leads: Array<{
        id: string;
        name: string;
        phone?: string;
        phoneNorm?: string;
        phones?: string[];
        city?: string;
        categoryName?: string;
    }>, template: string, delaySeconds?: number): Promise<{
        total: number;
        sentCount: number;
        failedCount: number;
        results: {
            id: string;
            name: string;
            phone: string;
            status: "sent" | "failed";
            error?: string;
        }[];
    }>;
}
export declare const whatsAppService: WhatsAppService;
//# sourceMappingURL=service.d.ts.map