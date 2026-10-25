import { Request, Response } from 'express';
export declare class ProvidersController {
    getProviders(req: Request, res: Response): Promise<void>;
    getKeys(req: Request, res: Response): Promise<void>;
    addKey(req: Request, res: Response): Promise<void>;
    updateKey(req: Request, res: Response): Promise<void>;
    deleteKey(req: Request, res: Response): Promise<void>;
    testConnection(req: Request, res: Response): Promise<void>;
    testSavedKey(req: Request, res: Response): Promise<void>;
}
export declare const providersController: ProvidersController;
//# sourceMappingURL=controller.d.ts.map