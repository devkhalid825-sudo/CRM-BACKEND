export declare class CommsService {
    /**
     * Voice call dispatcher: handles telephony dispatch and automatic call logging
     */
    initiateCall(leadId: string, phone: string, userId: string): Promise<{
        callLogId: string;
        telUri: string;
        phone: string;
        status: string;
    }>;
    /**
     * WhatsApp dispatcher: logs WhatsApp event and returns certified wa.me dispatch URL
     */
    sendWhatsApp(leadId: string, phone: string, text: string, userId: string): Promise<{
        success: boolean;
        waUrl: string;
        phone: string;
    }>;
}
export declare const commsService: CommsService;
//# sourceMappingURL=service.d.ts.map