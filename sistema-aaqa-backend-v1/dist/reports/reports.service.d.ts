import { EntityManager } from 'typeorm';
import { DashboardService } from '../dashboard/dashboard.service';
export declare class ReportsService {
    private readonly entityManager;
    private readonly dashboardService;
    constructor(entityManager: EntityManager, dashboardService: DashboardService);
    private normalizeCategory;
    private formatCurrency;
    private clampPercent;
    private buildBar;
    private generateCategoryExcelNative;
    private runNativeExcelScript;
    private getCurrentReportYear;
    private categoryTitle;
    private categoryDataKey;
    private buildExecutiveReportPayload;
    generateSummaryExcel(): Promise<Buffer>;
    generateSummaryPdf(): Promise<Buffer>;
    generateCategoryExcel(category: string, year?: number): Promise<Buffer>;
    generateProjectPdf(projectId: string): Promise<Buffer>;
    generateFormativeExcel(): Promise<Buffer>;
    private getProjects;
    private getProjectById;
    private getFormativeParticipants;
}
