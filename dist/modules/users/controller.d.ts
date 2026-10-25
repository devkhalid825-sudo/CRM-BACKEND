import { Request, Response } from 'express';
export declare class UsersController {
    listUsers(req: Request, res: Response): Promise<void>;
    createUser(req: Request, res: Response): Promise<void>;
    updateUser(req: Request, res: Response): Promise<void>;
    deleteUser(req: Request, res: Response): Promise<void>;
}
export declare const usersController: UsersController;
//# sourceMappingURL=controller.d.ts.map