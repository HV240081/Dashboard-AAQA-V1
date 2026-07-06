import type { Response } from 'express';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    generateSummaryPdf(res: Response): Promise<void>;
    generateSummaryExcel(res: Response): Promise<void>;
    generateCategoryExcel(category: string, year: string, res: Response): Promise<void>;
    generateProjectPdf(id: string, res: Response): Promise<void>;
    generateFormativeExcel(res: Response): Promise<void>;
}
