import { Namespace } from 'socket.io';
export declare function setupChatSocket(ns: Namespace): void;
export declare function broadcastChatMessage(conversationId: string, message: any): void;
export declare function broadcastMessageUpdated(conversationId: string, message: any): void;
export declare function broadcastMessageDeleted(conversationId: string, messageId: string): void;
export declare function broadcastConversationDeleted(conversationId: string): void;
//# sourceMappingURL=chat.d.ts.map