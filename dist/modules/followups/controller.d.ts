import { Request, Response } from 'express';
export declare class FollowupController {
    getRules(_req: Request, res: Response): Promise<void>;
    createRule(req: Request, res: Response): Promise<void>;
    toggleRule(req: Request, res: Response): Promise<void>;
    getTasks(req: Request, res: Response): Promise<void>;
    runCheck(_req: Request, res: Response): Promise<void>;
}
export declare const followupController: FollowupController;
//# sourceMappingURL=controller.d.ts.map