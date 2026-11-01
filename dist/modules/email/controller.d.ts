import { Request, Response } from 'express';
export declare class EmailController {
    send(req: Request, res: Response): Promise<void>;
    list(req: Request, res: Response): Promise<void>;
    getTemplates(_req: Request, res: Response): Promise<void>;
    createTemplate(req: Request, res: Response): Promise<void>;
    getAccounts(req: Request, res: Response): Promise<void>;
    addAccount(req: Request, res: Response): Promise<void>;
}
export declare const emailController: EmailController;
//# sourceMappingURL=controller.d.ts.map