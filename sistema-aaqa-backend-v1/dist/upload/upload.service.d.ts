declare let UploadService: {
    new (entityManager: any, dashboardService: any): {
        entityManager: any;
        dashboardService: any;
        normalizeText(value: any): any;
        permissionKeyForCategory(category: any): any;
        canUserEditCategory(user: any, category: any): any;
        parseLooseNumber(value: any): number;
        normalizePercentValue(value: any): number;
        normalizeColumnKey(key: any): any;
        normalizeCategory(category: any): "ONG" | "Community" | "FIS";
        normalizeMysqlDate(value: any): any;
        ensureEditionExists(year: any): Promise<any>;
        ensureCommunitySchema(): Promise<void>;
        getCommunityYearSequenceId(prefix: any, year: any, sequence: any): string;
        parseCommunitySequence(id: any, prefix: any, year: any): number;
        parseCommunityParticipantSequence(id: any, adescoId: any): number;
        normalizeProjectStatus(value: any): "Activo" | "Finalizado" | "Suspendido" | "En Cierre" | "En Ejecución";
        normalizeMonthlyStatus(value: any): "Finalizado" | "En Proceso" | "Pendiente";
        normalizeActivityStatus(value: any): "pending" | "active" | "completed";
        getMonthNumber(value: any): any;
        resolveProjectMonthValue(rawMonth: any, projectStartMonth: any): any;
        buildTimelineMonthSequence(startMonth: any, endMonth: any): number[];
        computeTimelineDurationMonths(startMonth: any, endMonth: any): number;
        buildTimelineMonthSlots(startMonth: any, endMonth: any, startYear?: number): {
            month: number;
            year: number;
            index: number;
        }[];
        resolveProjectTimelineError(projectName: any): string;
        validateProjectTimeline(projectMeta: any, projectName: any): {
            startMonth: any;
            endMonth: any;
            sequence: number[];
            durationMonths: number;
            slots: {
                month: number;
                year: number;
                index: number;
            }[];
        };
        resolveTimelineSlot(rawMonth: any, timeline: any, lastIndex?: number): any;
        resolveTrackingMonth(rawMonth: any, projectStartMonth: any): any;
        upsertProjectActivity(projectId: any, activity: any, options?: {}): Promise<any>;
        recalculateProjectProgress(projectId: any): Promise<{
            cumulativeTechnical: number;
            cumulativeFinancial: number;
        }>;
        formatMonthlyTrackingUploadError(error: any, projectName: any): string;
        getCategoryCode(category: any): "ONG" | "FIS" | "DC";
        findOrCreateOrganization(orgName: any, category: any): Promise<any>;
        resolveProjectByTrackingInfo(projectName: any, options?: {}): Promise<any>;
        pickValue(row: any, keys: any, fallback?: any): any;
        extractWorkbookProjectContext(workbook: any): {
            sheetName: string;
            name: any;
            organization: any;
            category: any;
            year: any;
            department: any;
            municipality: any;
            startMonth: any;
            endMonth: any;
            durationMonths: any;
            investmentFgk: any;
            contrapartida: any;
            alliedFunds: any;
            directBeneficiaries: any;
            indirectBeneficiaries: any;
            status: any;
        } | {
            sheetName?: undefined;
            name?: undefined;
            organization?: undefined;
            category?: undefined;
            year?: undefined;
            department?: undefined;
            municipality?: undefined;
            startMonth?: undefined;
            endMonth?: undefined;
            durationMonths?: undefined;
            investmentFgk?: undefined;
            contrapartida?: undefined;
            alliedFunds?: undefined;
            directBeneficiaries?: undefined;
            indirectBeneficiaries?: undefined;
            status?: undefined;
        };
        extractSheetRowsWithHeaders(sheet: any, headerMatchers?: any[]): any;
        validateProjectId(id: any, year: any): any;
        validateParticipantId(id: any): any;
        inferProjectYearFromId(projectId: any): number;
        generateCustomProjectId(year: any, category: any, manager: any): Promise<string>;
        ensureProjectCoreSchema(): Promise<void>;
        ensureProjectActivitiesSchema(): Promise<void>;
        ensureMonthlyReportsSchema(): Promise<void>;
        ensureParticipantCoreSchema(): Promise<void>;
        processExcel(file: any, user: any, context?: {}): Promise<{
            success: boolean;
            message: string;
            results: {
                proyectos: {
                    created: number;
                    updated: number;
                    errors: any[];
                };
                participantes: {
                    created: number;
                    updated: number;
                    errors: any[];
                };
                aliados: {
                    created: number;
                    updated: number;
                    errors: any[];
                };
                actividades: {
                    created: number;
                    updated: number;
                    errors: any[];
                };
                reportes: {
                    created: number;
                    updated: number;
                    errors: any[];
                };
            };
        }>;
        cleanupOrphanFollowUpData(): Promise<{
            totalDeleted: number;
            summary: {};
        }>;
        normalizeOptionalText(value: any): any;
        buildNormalizedRow(row: any): {};
        isCommunityFlatTemplateRows(rows: any): boolean;
        buildCommunityCortesFromFlatRows(rows: any): any[];
        processCommunityCortesExcel(file: any, user: any): Promise<any>;
        processFisParticipantsExcel(file: any, user: any): Promise<{
            success: boolean;
            message: string;
            total: number;
        }>;
        processProjectRow(row: any, context?: {}): Promise<{
            projectId: any;
            category: string;
            projectName: any;
            year: number;
        }>;
        processParticipantRow(row: any, indexMap: any, context?: {}): Promise<{
            participantId: any;
            category: string;
        }>;
        processAllyRow(row: any, user?: any, context?: {}): Promise<void>;
        processProjectActivitiesSheet(rows: any, user?: any, context?: {}): Promise<{
            created: number;
            updated: number;
            errors: any[];
        }>;
        processSimplifiedMonthlyTrackingSheet(sheet: any, user?: any, context?: {}): Promise<{
            created: number;
            updated: number;
            errors: any[];
        }>;
        processSimplifiedMonthlyTrackingBlocks(sheet: any, user?: any, context?: {}): Promise<{
            created: number;
            updated: number;
            errors: any[];
        }>;
        processMonthlyReportRow(row: any, user?: any, context?: {}): Promise<void>;
        uploadImage(file: any, projectId: any, userId: any): Promise<string>;
        getCurrentEditionId(): Promise<any>;
    };
};
export { UploadService };
