import { OnModuleInit } from '@nestjs/common';
import { EntityManager } from 'typeorm';
export declare class ProjectsService implements OnModuleInit {
    private readonly entityManager;
    constructor(entityManager: EntityManager);
    onModuleInit(): Promise<void>;
    private normalizeCategory;
    private getCategoryCode;
    private getProjectIdCandidates;
    private normalizeScheduleStatus;
    private normalizeActivityStatus;
    private getMonthNumber;
    private buildTimelineMonthSequence;
    private computeTimelineDurationMonths;
    private deriveTimelineEndMonth;
    private normalizeMetaFinancial;
    private validateMetaFinancialAgainstFgk;
    private ensureTimelineSchema;
    private ensureProjectCoreSchema;
    private ensureProjectDocumentsSchema;
    private ensureProjectActivitiesSchema;
    private ensureProjectCommentsSchema;
    private ensureMonthlyReportsSchema;
    private splitUrls;
    private safeParseJsonArray;
    private safeParseJsonObject;
    private syncProjectPhotos;
    private syncProjectDocuments;
    private recalculateProjectProgress;
    private findOrCreateOrganization;
    generateCustomProjectId(year: number, category: any, manager?: EntityManager): Promise<string>;
    updateProject(id: string, projectData: any, userId: number): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: any;
    }>;
    private syncProjectActivities;
    private syncPrimaryAllyContribution;
    private deleteProjectFiles;
    private slugifySegment;
    private deleteDirectoryIfExists;
    private deleteProjectResourceFolders;
    private deleteProjectCascade;
    private syncProjectMonthObservations;
    private syncProjectMonthComments;
    private syncProjectReports;
    createProject(projectData: any, userId: number): Promise<{
        success: boolean;
        message: string;
        id: string;
        data: any;
    }>;
    deleteProject(id: string, userId: number): Promise<{
        success: boolean;
        message: string;
    }>;
    getProjectById(id: string): Promise<any>;
    addReport(projectId: string, reportData: {
        month: number;
        year: number;
        realTechnical: number;
        realFinancial: number;
        metaFinancial?: number;
        expectedFinancial?: number;
        scheduleStatus: string;
        observations: string;
        photos: string[];
        createdBy: string;
    }, userId: number): Promise<any>;
    updateReport(projectId: string, reportId: string, reportData: {
        month: number;
        year: number;
        realTechnical: number;
        realFinancial: number;
        metaFinancial?: number;
        expectedFinancial?: number;
        scheduleStatus: string;
        observations: string;
        photos: string[];
        createdBy: string;
    }, userId: number): Promise<any>;
    deleteReport(projectId: string, reportId: string, userId: number): Promise<any>;
    updateProgressMatrix(projectId: string, progress: string[], userId: number): Promise<any>;
    getAllProjects(filters?: {
        year?: number;
        category?: string;
        status?: string;
    }): Promise<any>;
}
