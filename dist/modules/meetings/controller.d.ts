import { Request, Response } from 'express';
export declare class MeetingsController {
    schedule(req: Request, res: Response): Promise<void>;
    list(req: Request, res: Response): Promise<void>;
    update(req: Request, res: Response): Promise<void>;
}
export declare const meetingsController: MeetingsController;
//# sourceMappingURL=controller.d.ts.map