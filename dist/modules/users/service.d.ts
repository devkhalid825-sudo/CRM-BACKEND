import { CreateUserInput, UpdateUserInput, UserDTO } from '../../shared/index.js';
export declare class UsersService {
    private isMongo;
    listUsers(): Promise<UserDTO[]>;
    createUser(data: CreateUserInput): Promise<UserDTO>;
    updateUser(userId: string, data: UpdateUserInput): Promise<UserDTO>;
    deleteUser(userId: string): Promise<void>;
}
export declare const usersService: UsersService;
//# sourceMappingURL=service.d.ts.map