import { EntityManager } from 'typeorm';
export declare class DashboardService {
    private readonly entityManager;
    constructor(entityManager: EntityManager);
    private normalizeText;
    private normalizeCategory;
    private safeParseJsonArray;
    private normalizeMysqlDate;
    private ensureCommunitySchema;
    private getCommunityYearSequenceId;
    private parseCommunitySequence;
    private parseCommunityParticipantSequence;
    private buildNextCommunityId;
    private ensureEditionExists;
    private isEditionAvailable;
    private normalizeActivityStatus;
    private getMonthNumber;
    private buildTimelineMonthSequence;
    getGlobalData(year?: number): Promise<{
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
    getCategoriesData(year?: number): Promise<{
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
    getFormativeData(year?: number): Promise<{
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
    getProjects(filters: {
        year?: number;
        category?: string;
    }): Promise<any[]>;
    getCommunityCortes(): Promise<any>;
    updateCommunityCortes(cortes: any[]): Promise<{
        success: boolean;
        message: string;
        warnings: string[];
        results: {
            cortes: number;
            adescos: number;
            participantes: number;
        };
    }>;
    deleteCommunityCorte(corteId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getFisParticipants(year?: number): Promise<{
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
    replaceFisParticipants(participants: any[], userId?: number): Promise<{
        success: boolean;
        message: string;
        total: number;
    }>;
    deleteFisParticipant(participantId: string, userId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    getDepartamentos(): Promise<string[]>;
    getMunicipios(departamento: string): Promise<string[]>;
    getDistritos(departamento: string, municipio: string): Promise<string[]>;
    getTextos(categoria?: string): Promise<Record<string, string>>;
    updateTexto(categoria: string, clave: string, valor: string, usuarioId: number): Promise<any>;
    getAvailableYears(): Promise<number[]>;
    createEdition(year: number, status?: string): Promise<any>;
    deleteEdition(year: number): Promise<any>;
    getGeoData(year?: number): Promise<any[]>;
    getStatsByDepartamento(year?: number): Promise<any[]>;
    compareYears(years: number[]): Promise<any>;
    getCommunityCounterpart(projectId: string): Promise<any>;
    updateCommunityCounterpart(projectId: string, data: {
        laborAmount: number;
        materialsAmount: number;
    }, usuarioId: number): Promise<any>;
    updateFinancials(data: {
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
    updateCategories(data: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    updateFormative(data: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    updateCurrentEdition(data: any): Promise<{
        success: boolean;
        message: string;
        data: any;
    }>;
    getTextContent(): Promise<Record<string, string>>;
    updateTextContent(category: string, key: string, value: string): Promise<{
        success: boolean;
        message: string;
        simulated?: undefined;
    } | {
        success: boolean;
        message: string;
        simulated: boolean;
    }>;
    getEditions(): Promise<any>;
}
