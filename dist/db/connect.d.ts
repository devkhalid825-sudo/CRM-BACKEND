import mongoose from 'mongoose';
/**
 * Safely masks database credentials for logging
 */
export declare function maskMongoUri(uri: string): string;
/**
 * Detects whether the URI targets a MongoDB Atlas Cloud cluster
 */
export declare function isAtlasUri(uri: string): boolean;
export declare function connectDB(): Promise<typeof mongoose | null>;
export declare function disconnectDB(): Promise<void>;
//# sourceMappingURL=connect.d.ts.map