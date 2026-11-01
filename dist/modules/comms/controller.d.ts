import { Request, Response } from 'express';
export declare class CommsController {
    call(req: Request, res: Response): Promise<void>;
    whatsapp(req: Request, res: Response): Promise<void>;
    status(_req: Request, res: Response): Promise<void>;
}
export declare const commsController: CommsController;
//# sourceMappingURL=controller.d.ts.map