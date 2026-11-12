import { Request, Response } from 'express';
export declare class ReportsController {
    getOverview(_req: Request, res: Response): Promise<void>;
    getGeo(_req: Request, res: Response): Promise<void>;
    getCategories(_req: Request, res: Response): Promise<void>;
    getTeam(_req: Request, res: Response): Promise<void>;
    getGoogleAds(_req: Request, res: Response): Promise<void>;
    recordHeartbeat(req: Request, res: Response): Promise<void>;
}
export declare const reportsController: ReportsController;
//# sourceMappingURL=controller.d.ts.map