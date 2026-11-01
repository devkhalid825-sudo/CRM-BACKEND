import { Request, Response } from 'express';
export declare class ProposalsController {
    create(req: Request, res: Response): Promise<void>;
    list(req: Request, res: Response): Promise<void>;
    generateDraft(req: Request, res: Response): Promise<void>;
    getPublicByToken(req: Request, res: Response): Promise<void>;
    actionPublic(req: Request, res: Response): Promise<void>;
}
export declare const proposalsController: ProposalsController;
//# sourceMappingURL=controller.d.ts.map