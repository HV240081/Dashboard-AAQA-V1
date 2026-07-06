import { EntityManager } from 'typeorm';
export declare class AppService {
    private readonly entityManager;
    constructor(entityManager: EntityManager);
    getHello(): string;
    getColumns(table: string): Promise<any>;
}
