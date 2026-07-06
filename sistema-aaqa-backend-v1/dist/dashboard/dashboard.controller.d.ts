import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getGlobalData(year?: string): Promise<{
        financials: {
            fgk: number;
            aliados: number;
            contrapartida: number;
        };
        impact: {
            projects: number;
            orgs: number;
            beneficiaries: number;
        };
    }>;
    getCategoriesData(year?: string): Promise<{
        ong: {
            investment: number;
            orgs: number;
            projects: number;
        };
        community: {
            investment: number;
            orgs: number;
            projects: number;
        };
        fis: {
            investment: number;
            ventures: number;
            projects: number;
        };
    }>;
    getFormativeData(year?: string): Promise<{
        totalEnrolled: number;
        totalGraduated: number;
        retentionRate: number;
        byGender: {
            F: number;
            M: number;
        };
        byCategory: {
            ong: {
                enrolled: number;
                graduated: number;
            };
            community: {
                enrolled: number;
                graduated: number;
            };
            fis: {
                enrolled: number;
                graduated: number;
            };
        };
        byDepartment: Record<string, number>;
    }>;
    getProjects(year?: string, category?: string): Promise<any[]>;
    getEditions(): Promise<any>;
    createEdition(req: any, body: {
        year: number;
    }): Promise<any>;
    deleteEdition(req: any, year: string): Promise<any>;
    getCommunityCortes(): Promise<any>;
    updateCommunityCortes(req: any, body: {
        cortes: any[];
    }): Promise<{
        success: boolean;
        message: string;
        warnings: string[];
        results: {
            cortes: number;
            adescos: number;
            participantes: number;
        };
    }>;
    deleteCommunityCorte(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getFisParticipants(year?: string): Promise<{
        id: any;
        year: any;
        program: any;
        campus: any;
        name: any;
        gender: any;
        age: any;
        ventureName: any;
        department: any;
        status: any;
        observations: any;
        source: any;
        projectId: any;
    }[]>;
    replaceFisParticipants(req: any, body: {
        participants: any[];
    }): Promise<{
        success: boolean;
        message: string;
        total: number;
    }>;
    deleteFisParticipant(req: any, id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteFisParticipantLegacy(req: any, body: {
        id: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getTextContent(): Promise<Record<string, string>>;
    getDepartamentos(): Promise<string[]>;
    getMunicipios(departamento: string): Promise<string[]>;
    getDistritos(departamento: string, municipio: string): Promise<string[]>;
    getTextos(categoria?: string): Promise<Record<string, string>>;
    getAvailableYears(): Promise<number[]>;
    getGeoData(year?: string): Promise<any[]>;
    getStatsByDepartamento(year?: string): Promise<any[]>;
    compareYears(years: string): Promise<any>;
    getCommunityCounterpart(projectId: string): Promise<any>;
    updateFinancials(req: any, body: {
        fgk: number;
        aliados: number;
        contrapartida: number;
    }): Promise<{
        success: boolean;
        message: string;
        data: {
            fgk: number;
            aliados: number;
            contrapartida: number;
        };
    }>;
    updateCategories(req: any, body: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    updateFormative(req: any, body: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    updateCurrentEdition(req: any, body: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    updateTextContent(req: any, body: {
        category: string;
        key: string;
        value: string;
    }): Promise<{
        success: boolean;
        message: string;
        simulated?: undefined;
    } | {
        success: boolean;
        message: string;
        simulated: boolean;
    }>;
    updateTexto(req: any, body: {
        categoria: string;
        clave: string;
        valor: string;
    }): Promise<any>;
    updateCommunityCounterpart(projectId: string, body: {
        laborAmount: number;
        materialsAmount: number;
    }, req: any): Promise<any>;
}
