import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getPing(): string;
    getColumns(table: string): Promise<any>;
}
