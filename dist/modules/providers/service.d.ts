import { IProviderKey } from '../../db/models/ProviderKey.js';
import { ProviderId, ProviderKeyDTO, ProviderConfigDTO, CreateProviderKeyInput, UpdateProviderKeyInput, TestConnectionResult } from '../../shared/index.js';
export declare function toProviderKeyDTO(key: IProviderKey): ProviderKeyDTO;
export declare class ProvidersService {
    /**
     * Ensure default provider records exist in database
     */
    ensureDefaults(): Promise<void>;
    /**
     * List all providers with summary counts
     */
    getProviders(): Promise<ProviderConfigDTO[]>;
    /**
     * Get keys for a provider
     */
    getKeysForProvider(providerId: string): Promise<ProviderKeyDTO[]>;
    /**
     * Add a new API key
     */
    addKey(data: CreateProviderKeyInput): Promise<ProviderKeyDTO>;
    /**
     * Update a key
     */
    updateKey(keyId: string, data: UpdateProviderKeyInput): Promise<ProviderKeyDTO>;
    /**
     * Delete a key
     */
    deleteKey(keyId: string): Promise<void>;
    /**
     * Test an external connection using a raw or stored key
     */
    testConnection(providerId: ProviderId, apiKey: string): Promise<TestConnectionResult>;
    /**
     * Test a saved key from database
     */
    testSavedKey(keyId: string): Promise<TestConnectionResult>;
}
export declare const providersService: ProvidersService;
//# sourceMappingURL=service.d.ts.map