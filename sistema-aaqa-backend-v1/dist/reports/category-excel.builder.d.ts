type ProjectRow = {
    id: string;
    name: string;
    organization: string;
    category: string;
    department: string;
    municipality?: string;
    amountFGK: number;
    counterpart: number;
    amountAllies: number;
    beneficiaries: number;
    indirectBeneficiaries?: number;
    status?: string | null;
    year: number;
    technicalProgressPercentage: number;
    financialProgressPercentage: number;
};
type CategoryStats = {
    projects: number;
    investment: number;
    orgs?: number;
    ventures?: number;
};
export declare function buildCategoryExcelWorkbook(params: {
    category: string;
    year?: number;
    currentProjects: ProjectRow[];
    historicalProjects: ProjectRow[];
    currentStats: CategoryStats;
    historicalStats: CategoryStats;
    formativeCurrent: any;
    formativeHistorical: any;
    currentYear: number;
}): Promise<Buffer<any>>;
export {};
