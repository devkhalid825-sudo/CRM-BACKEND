import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../shared/index.js';
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    name: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map