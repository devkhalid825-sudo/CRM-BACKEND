import { ProviderKind, ProviderId } from '../shared/index.js';
import { ActiveKey } from './keyPool.js';
export interface FailoverOptions {
    pinnedProviderId?: ProviderId;
    pinnedKeyId?: string;
}
export declare class FailoverService {
    /**
     * Run an external operation with automatic key rotation and provider failover
     */
    run<T>(kind: ProviderKind, operation: (key: ActiveKey) => Promise<T>, options?: FailoverOptions): Promise<T>;
}
export declare const failover: FailoverService;
//# sourceMappingURL=failover.d.ts.map