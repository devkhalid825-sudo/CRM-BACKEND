export declare class WhatsAppService {
    /**
     * Get current session status for a specific user
     */
    getStatus(userId: string): Promise<{
        status: string;
        phone: any;
        name: any;
        qrCodeUrl: null;
    } | {
        status: "connected" | "disconnected" | "connecting";
        phone: string | null;
        name: string | null;
        qrCodeUrl: string | null;
    }>;
    /**
     * Start WhatsApp session and return QR code
     */
    startSession(userId: string, forceFresh?: boolean): Promise<{
        status: string;
        qrCodeUrl: string | null;
        phone?: string | null;
        name?: string | null;
    }>;
    /**
     * Request an 8-character pairing code for linking directly via phone number
     */
    requestPairingCode(userId: string, rawPhone: string): Promise<{
        success: boolean;
        code?: string;
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
    /**
     * Send document, image, or audio media via WhatsApp
     */
    sendMediaMessage(userId: string, rawPhone: string, media: {
        type: 'document' | 'image' | 'audio';
        data: string | Buffer;
        fileName?: string;
        mimetype?: string;
        caption?: string;
    }, leadId?: string): Promise<{
        success: boolean;
        phone: string;
    }>;
}
export declare const whatsAppService: WhatsAppService;
//# sourceMappingURL=service.d.ts.map