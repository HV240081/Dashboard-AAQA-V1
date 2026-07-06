import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private readonly projectsService;
    constructor(projectsService: ProjectsService);
    private ensureFullAccess;
    addReport(id: string, reportData: any, req: any): Promise<any>;
    getProjectById(id: string, req: any): Promise<any>;
    updateReport(id: string, reportId: string, reportData: any, req: any): Promise<any>;
    deleteReport(id: string, reportId: string, req: any): Promise<any>;
    updateMatrix(id: string, progress: string[], req: any): Promise<any>;
    updateProject(id: string, projectData: any, req: any): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
    } | {
        success: boolean;
        message: string;
        data: any;
    }>;
    createProject(projectData: any, req: any): Promise<{
        success: boolean;
        message: string;
        id: string;
        data: any;
    }>;
    deleteProject(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
