import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../shared/index.js';
export declare function requireRole(...allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=requireRole.d.ts.map