import { Request, Response } from 'express';
export declare class ConsoleController {
    getConfig(req: Request, res: Response): Promise<void>;
    setConfig(req: Request, res: Response): Promise<void>;
    parseEnv(req: Request, res: Response): Promise<void>;
    applyEnv(req: Request, res: Response): Promise<void>;
    getLogs(req: Request, res: Response): Promise<void>;
    getAudit(req: Request, res: Response): Promise<void>;
    reloadConfig(req: Request, res: Response): Promise<void>;
    getHealth(req: Request, res: Response): Promise<void>;
}
export declare const consoleController: ConsoleController;
//# sourceMappingURL=controller.d.ts.map