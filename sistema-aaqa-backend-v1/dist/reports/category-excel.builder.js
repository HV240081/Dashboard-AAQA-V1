"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCategoryExcelWorkbook = buildCategoryExcelWorkbook;
const node_fs_1 = require("node:fs");
const node_url_1 = require("node:url");
async function buildCategoryExcelWorkbook(params) {
    const { category, year, currentProjects, historicalProjects, currentStats, historicalStats, formativeCurrent, formativeHistorical, currentYear, } = params;
    const normalize = (value) => {
        const normalized = (value ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalized.includes('comunitari') || normalized.includes('community') || normalized === 'dc')
            return 'Community';
        if (normalized.includes('fis') || normalized.includes('emprend') || normalized.includes('incub'))
            return 'FIS';
        return 'ONG';
    };
    const normalizedCategory = normalize(category);
    const formativeKey = normalizedCategory === 'ONG'
        ? 'ong'
        : normalizedCategory === 'Community'
            ? 'community'
            : 'fis';
    const categoryConfig = normalizedCategory === 'ONG'
        ? {
            title: 'Vision Historica - ONG',
            orgLabel: 'Orgs. Apoyadas',
            historyOrgLabel: 'Orgs. Formadas',
            projectsLabel: 'Proyectos Totales',
            investmentLabel: 'Inversion FGK',
            alliesLabel: 'Fondos Aliados',
            beneficiaryLabel: 'Beneficiarios Est.',
            participantLabel: 'Participantes (Historico)',
            monitorLabel: 'Monitor: Edicion Vigente',
            currentOrgLabel: 'Vista Monitor',
            currentProjectsLabel: 'Orgs. Apoyadas',
            directBeneficiariesLabel: 'Beneficiarios Directos',
            indirectBeneficiariesLabel: 'Beneficiarios Indirectos',
        }
        : normalizedCategory === 'Community'
            ? {
                title: 'Vision Historica - Desarrollo Comunitario',
                orgLabel: 'ADESCOS',
                historyOrgLabel: 'ADESCOS Formadas',
                projectsLabel: 'Proyectos Totales',
                investmentLabel: 'Inversion FGK',
                alliesLabel: 'Fondos Aliados',
                beneficiaryLabel: 'Beneficiarios Est.',
                participantLabel: 'Participantes (Historico)',
                monitorLabel: 'Monitor: Edicion Vigente',
                currentOrgLabel: 'Vista Monitor',
                currentProjectsLabel: 'ADESCOS',
                directBeneficiariesLabel: 'Beneficiarios Directos',
                indirectBeneficiariesLabel: 'Beneficiarios Indirectos',
            }
            : {
                title: 'Vision Historica - Emprendimiento Social',
                orgLabel: 'Emprendimientos',
                historyOrgLabel: 'Emprendimientos Formados',
                projectsLabel: 'Proyectos Totales',
                investmentLabel: 'Inversion FGK',
                alliesLabel: 'Fondos Aliados',
                beneficiaryLabel: 'Beneficiarios Est.',
                participantLabel: 'Participantes (Historico)',
                monitorLabel: 'Monitor: Edicion Vigente',
                currentOrgLabel: 'Vista Monitor',
                currentProjectsLabel: 'Emprendimientos',
                directBeneficiariesLabel: 'Beneficiarios Directos',
                indirectBeneficiariesLabel: 'Beneficiarios Indirectos',
            };
    const sum = (list, key) => list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
    const avg = (list, key) => {
        if (!list.length)
            return 0;
        return list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0) / list.length;
    };
    const clamp = (value) => Math.max(0, Math.min(100, Number((Number.isFinite(value) ? value : 0).toFixed(2))));
    const formatCurrency = (value) => {
        const numeric = typeof value === 'number' ? value : parseFloat((value ?? '0').toString());
        return `$${(Number.isFinite(numeric) ? numeric : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    const currentBeneficiaries = currentProjects.reduce((acc, p) => acc + (Number(p.beneficiaries) || 0), 0);
    const currentIndirectBeneficiaries = currentProjects.reduce((acc, p) => acc + (Number(p.indirectBeneficiaries) || 0), 0);
    const currentOrgCount = normalizedCategory === 'FIS' ? Number(currentStats.ventures || 0) : Number(currentStats.orgs || 0);
    const historicalOrgCount = normalizedCategory === 'FIS' ? Number(historicalStats.ventures || 0) : Number(historicalStats.orgs || 0);
    const currentTechnicalAvg = currentProjects.length > 0 ? clamp(avg(currentProjects, 'technicalProgressPercentage')) : 0;
    const currentFinancialAvg = currentProjects.length > 0 ? clamp(avg(currentProjects, 'financialProgressPercentage')) : 0;
    const currentAllies = sum(currentProjects, 'amountAllies');
    const currentCounterpart = sum(currentProjects, 'counterpart');
    const currentFgk = Number(currentStats?.investment || 0);
    const historicalAllies = sum(historicalProjects, 'amountAllies');
    const historicalFgk = sum(historicalProjects, 'amountFGK');
    const historicalBeneficiaries = historicalProjects.reduce((acc, p) => acc + (Number(p.beneficiaries) || 0), 0);
    const historicalByYear = new Map();
    for (const project of historicalProjects) {
        const projectYear = Number(project.year) || currentYear;
        const bucket = historicalByYear.get(projectYear) || {
            year: projectYear,
            projects: 0,
            organizations: new Set(),
            fgk: 0,
            allies: 0,
            counterpart: 0,
            beneficiaries: 0,
            technical: [],
            financial: [],
        };
        bucket.projects += 1;
        if (project.organization)
            bucket.organizations.add(project.organization);
        bucket.fgk += Number(project.amountFGK) || 0;
        bucket.allies += Number(project.amountAllies) || 0;
        bucket.counterpart += Number(project.counterpart) || 0;
        bucket.beneficiaries += Number(project.beneficiaries) || 0;
        bucket.technical.push(Number(project.technicalProgressPercentage) || 0);
        bucket.financial.push(Number(project.financialProgressPercentage) || 0);
        historicalByYear.set(projectYear, bucket);
    }
    const historicalRows = Array.from(historicalByYear.values())
        .sort((a, b) => b.year - a.year)
        .map((item) => ([
        item.year,
        item.projects,
        item.organizations.size,
        item.fgk,
        item.counterpart,
        item.allies,
        item.beneficiaries,
        clamp(avg(item.technical, 'value') || (item.technical.reduce((a, b) => a + b, 0) / Math.max(1, item.technical.length))),
        clamp(avg(item.financial, 'value') || (item.financial.reduce((a, b) => a + b, 0) / Math.max(1, item.financial.length))),
    ]));
    const projectRows = currentProjects.map((p) => ([
        p.id,
        p.name,
        p.organization,
        p.category,
        p.department,
        p.municipality || '',
        p.amountFGK,
        p.counterpart,
        p.amountAllies,
        p.beneficiaries,
        p.indirectBeneficiaries || 0,
        p.status || '',
        p.year,
        clamp(Number(p.technicalProgressPercentage) || 0),
        clamp(Number(p.financialProgressPercentage) || 0),
    ]));
    const artifactToolPath = 'C:\\Users\\DELL\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\@oai\\artifact-tool\\dist\\artifact_tool.mjs';
    if (!(0, node_fs_1.existsSync)(artifactToolPath)) {
        throw new Error('No se encontro el generador nativo de Excel en este entorno.');
    }
    const { Workbook, SpreadsheetFile } = await import((0, node_url_1.pathToFileURL)(artifactToolPath).href);
    const wb = Workbook.create();
    const monitor = wb.worksheets.add('Monitor');
    const historical = wb.worksheets.add('Historico');
    const detail = wb.worksheets.add('Proyectos');
    monitor.showGridLines = false;
    historical.showGridLines = false;
    detail.showGridLines = false;
    monitor.getRange('A1:F1').merge();
    monitor.getRange('A1').values = [[categoryConfig.title]];
    monitor.getRange('A1').format = { font: { bold: true, size: 16, color: '#0F172A' } };
    monitor.getRange('A2:F2').merge();
    monitor.getRange('A2').values = [[`Datos consolidados desde el inicio de operaciones en esta categoria`]];
    monitor.getRange('A2').format = { font: { italic: true, color: '#475569' } };
    monitor.getRange('A4:D4').merge();
    monitor.getRange('A4').values = [['Vision Historica']];
    monitor.getRange('A4').format = { fill: '#0F766E', font: { bold: true, color: '#FFFFFF' } };
    monitor.getRange('A5:B10').values = [
        ['Indicador', 'Valor'],
        [categoryConfig.orgLabel, historicalOrgCount],
        [categoryConfig.projectsLabel, historicalStats.projects || 0],
        [categoryConfig.investmentLabel, formatCurrency(historicalFgk)],
        [categoryConfig.alliesLabel, formatCurrency(historicalAllies)],
        [categoryConfig.beneficiaryLabel, historicalBeneficiaries],
    ];
    monitor.getRange('A5:B10').format.borders = { preset: 'all', style: 'thin', color: '#D9E2EC' };
    monitor.getRange('A5:B5').format = { fill: '#E2E8F0', font: { bold: true } };
    monitor.getRange('A12:D12').merge();
    monitor.getRange('A12').values = [['Formacion Historica']];
    monitor.getRange('A12').format = { fill: '#1D4ED8', font: { bold: true, color: '#FFFFFF' } };
    monitor.getRange('A13:B15').values = [
        ['Indicador', 'Valor'],
        [categoryConfig.historyOrgLabel, formativeHistorical.byCategory[formativeKey].graduated || 0],
        [categoryConfig.participantLabel, formativeHistorical.byCategory[formativeKey].enrolled || 0],
    ];
    monitor.getRange('A13:B15').format.borders = { preset: 'all', style: 'thin', color: '#D9E2EC' };
    monitor.getRange('A13:B13').format = { fill: '#E2E8F0', font: { bold: true } };
    monitor.getRange('A17:D17').merge();
    monitor.getRange('A17').values = [[`${categoryConfig.monitorLabel} ${currentYear}`]];
    monitor.getRange('A17').format = { fill: '#7C3AED', font: { bold: true, color: '#FFFFFF' } };
    monitor.getRange('A18:B24').values = [
        ['Indicador', 'Valor'],
        [categoryConfig.currentOrgLabel, currentOrgCount],
        [categoryConfig.currentProjectsLabel, currentStats.projects || 0],
        [categoryConfig.investmentLabel, formatCurrency(currentFgk)],
        [categoryConfig.alliesLabel, formatCurrency(currentAllies)],
        [categoryConfig.directBeneficiariesLabel, currentBeneficiaries],
        [categoryConfig.indirectBeneficiariesLabel, currentIndirectBeneficiaries],
    ];
    monitor.getRange('A18:B24').format.borders = { preset: 'all', style: 'thin', color: '#D9E2EC' };
    monitor.getRange('A18:B18').format = { fill: '#E2E8F0', font: { bold: true } };
    monitor.getRange('A26:D26').merge();
    monitor.getRange('A26').values = [['AVANCE']];
    monitor.getRange('A26').format = { fill: '#DC2626', font: { bold: true, color: '#FFFFFF' } };
    monitor.getRange('A27:B30').values = [
        ['Indicador', 'Valor'],
        ['Promedio Global', Number(((currentTechnicalAvg + currentFinancialAvg) / 2).toFixed(2))],
        ['Avance Tecnico Global', Number(currentTechnicalAvg.toFixed(2))],
        ['Ejecucion Financiera Global', Number(currentFinancialAvg.toFixed(2))],
    ];
    monitor.getRange('A27:B30').format.borders = { preset: 'all', style: 'thin', color: '#D9E2EC' };
    monitor.getRange('A27:B27').format = { fill: '#E2E8F0', font: { bold: true } };
    monitor.getRange('B28:B30').format.numberFormat = '0.00';
    monitor.getRange('F4:G7').values = [
        ['Concepto', 'Monto'],
        ['FGK', currentFgk],
        ['Contrapartida', currentCounterpart],
        ['Aliados', currentAllies],
    ];
    const fundsChart = monitor.charts.add('doughnut', monitor.getRange('F4:G7'));
    fundsChart.title = 'Composicion de Fondos';
    fundsChart.hasLegend = true;
    fundsChart.setPosition('I4', 'Q18');
    monitor.getRange('F10:G13').values = [
        ['Indicador', 'Valor'],
        ['Promedio Global', Number(((currentTechnicalAvg + currentFinancialAvg) / 2).toFixed(2))],
        ['Avance Tecnico Global', Number(currentTechnicalAvg.toFixed(2))],
        ['Ejecucion Financiera Global', Number(currentFinancialAvg.toFixed(2))],
    ];
    monitor.getRange('F10:G13').format.borders = { preset: 'all', style: 'thin', color: '#E2E8F0' };
    monitor.getRange('F10:G10').format = { fill: '#E2E8F0', font: { bold: true } };
    monitor.getRange('G11:G13').format.numberFormat = '0.00';
    const advanceChart = monitor.charts.add('bar', monitor.getRange('F10:G13'));
    advanceChart.title = 'AVANCE';
    advanceChart.hasLegend = false;
    advanceChart.setPosition('I20', 'Q35');
    historical.getRange('A1:I1').merge();
    historical.getRange('A1').values = [[`Historico por edicion - ${categoryConfig.title}`]];
    historical.getRange('A1').format = { fill: '#0F172A', font: { bold: true, color: '#FFFFFF' } };
    historical.getRange('A3:I3').values = [[
            'Anio',
            'Proyectos',
            'Organizaciones',
            'Inversion FGK',
            'Contrapartida',
            'Fondos Aliados',
            'Beneficiarios',
            'Prom. Tecnico',
            'Prom. Financiero',
        ]];
    historical.getRange('A4:I4').values = historicalRows.length > 0 ? historicalRows : [[currentYear, 0, 0, 0, 0, 0, 0, 0, 0]];
    historical.getRange('A3:I4').format.borders = { preset: 'all', style: 'thin', color: '#D9E2EC' };
    historical.getRange('A3:I3').format = { fill: '#E2E8F0', font: { bold: true } };
    detail.getRange('A1:O1').values = [[
            'ID Proyecto',
            'Nombre del Proyecto',
            'Organizacion',
            'Categoria',
            'Departamento',
            'Municipio',
            'Inversion FGK',
            'Contrapartida',
            'Fondos Aliados',
            'Beneficiarios Directos',
            'Beneficiarios Indirectos',
            'Estado',
            'Anio',
            'Avance Tecnico',
            'Ejecucion Financiera',
        ]];
    if (projectRows.length > 0) {
        detail.getRangeByIndexes(1, 0, projectRows.length, 15).values = projectRows;
    }
    else {
        detail.getRange('A2:O2').values = [['', '', '', '', '', '', 0, 0, 0, 0, 0, '', currentYear, 0, 0]];
    }
    detail.getRange('A1:O2').format.borders = { preset: 'all', style: 'thin', color: '#D9E2EC' };
    detail.getRange('A1:O1').format = { fill: '#0F766E', font: { bold: true, color: '#FFFFFF' } };
    detail.getRange('G2:K200').format.numberFormat = '$#,##0.00';
    detail.getRange('N2:O200').format.numberFormat = '0.00';
    const output = await SpreadsheetFile.exportXlsx(wb);
    return Buffer.from(output.data);
}
//# sourceMappingURL=category-excel.builder.js.map