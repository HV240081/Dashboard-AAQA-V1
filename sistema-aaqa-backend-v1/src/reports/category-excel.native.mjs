import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Uso: node category-excel.native.mjs <input.json> <output.xlsx>');
}

const input = JSON.parse((await fs.readFile(inputPath, 'utf8')).replace(/^\uFEFF/, ''));

const normalize = (value) => {
  const normalized = (value ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('comunitari') || normalized.includes('community') || normalized === 'dc') return 'Community';
  if (normalized.includes('fis') || normalized.includes('emprend') || normalized.includes('incub')) return 'FIS';
  return 'ONG';
};

const columnName = (index) => {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

const rangeFrom = (startRow, startCol, rowCount, colCount) => {
  const endRow = startRow + Math.max(1, rowCount) - 1;
  const endCol = startCol + Math.max(1, colCount) - 1;
  return `${columnName(startCol)}${startRow}:${columnName(endCol)}${endRow}`;
};

const clamp = (value) => Math.max(0, Math.min(100, Number.isFinite(value) ? Number(value.toFixed(2)) : 0));
const sum = (list, key) => list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
const avg = (list, key) => {
  if (!list.length) return 0;
  return list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0) / list.length;
};
const formatCurrency = (value) => `$${(Number.isFinite(Number(value)) ? Number(value) : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const normalizedCategory = normalize(input.category);
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

const currentProjects = input.currentProjects || [];
const historicalProjects = input.historicalProjects || [];
const formativeParticipants = input.formativeParticipants || [];
const currentStats = input.currentStats || {};
const historicalStats = input.historicalStats || {};
const formativeCurrent = input.formativeCurrent || {};
const formativeHistorical = input.formativeHistorical || {};
const currentYear = input.currentYear || new Date().getFullYear();
const formativeKey = normalizedCategory === 'ONG' ? 'ong' : normalizedCategory === 'Community' ? 'community' : 'fis';

const currentBeneficiaries = currentProjects.reduce((acc, p) => acc + (Number(p.beneficiaries) || 0), 0);
const currentIndirectBeneficiaries = currentProjects.reduce((acc, p) => acc + (Number(p.indirectBeneficiaries) || 0), 0);
const currentOrgCount = normalizedCategory === 'FIS' ? Number(currentStats.ventures || 0) : Number(currentStats.orgs || 0);
const historicalOrgCount = normalizedCategory === 'FIS' ? Number(historicalStats.ventures || 0) : Number(historicalStats.orgs || 0);
const currentTechnicalAvg = currentProjects.length > 0 ? clamp(avg(currentProjects, 'technicalProgressPercentage')) : 0;
const currentFinancialAvg = currentProjects.length > 0 ? clamp(avg(currentProjects, 'financialProgressPercentage')) : 0;
const currentAllies = sum(currentProjects, 'amountAllies');
const currentCounterpart = sum(currentProjects, 'counterpart');
const currentFgk = Number(currentStats.investment || 0);
const historicalAllies = sum(historicalProjects, 'amountAllies');
const historicalFgk = sum(historicalProjects, 'amountFGK');
const historicalBeneficiaries = historicalProjects.reduce((acc, p) => acc + (Number(p.beneficiaries) || 0), 0);

const normalizeGender = (value) => {
  const v = (value ?? '').toString().trim().toLowerCase();
  if (v === 'f' || v.includes('muj')) return 'Mujeres';
  if (v === 'm' || v.includes('hom')) return 'Hombres';
  return 'Otros';
};
const normalizeAge = (value) => {
  const age = Number(value) || 0;
  if (age >= 18 && age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  return '56+';
};
const participantRows = formativeParticipants.map((p) => ([
  p.nombre || '',
  Number(p.edad) || 0,
  normalizeGender(p.genero),
  p.organizacion_nombre || '',
  normalizedCategory === 'ONG' ? 'ONG' : normalizedCategory === 'Community' ? 'Desarrollo Comunitario' : 'Emprendimiento Social',
  Number(p.year) || currentYear,
  p.departamento || '',
  p.estado_formacion || '',
]));
const genderTotals = formativeParticipants.reduce((acc, p) => {
  const key = normalizeGender(p.genero);
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, { Mujeres: 0, Hombres: 0, Otros: 0 });
const ageTotals = formativeParticipants.reduce((acc, p) => {
  const key = normalizeAge(p.edad);
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 });
const regionTotals = formativeParticipants.reduce((acc, p) => {
  const key = (p.departamento ?? 'Sin dato').toString().trim() || 'Sin dato';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const topRegions = Object.entries(regionTotals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

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
  if (project.organization) bucket.organizations.add(project.organization);
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

const wb = Workbook.create();
const monitor = wb.worksheets.add('Monitor');
const historical = wb.worksheets.add('Historico');
const detail = wb.worksheets.add('Proyectos');

monitor.showGridLines = false;
historical.showGridLines = false;
detail.showGridLines = false;

monitor.getRange('A1:F1').merge();
monitor.getRange('A1').values = [[categoryConfig.title]];
monitor.getRange('A2:F2').merge();
monitor.getRange('A2').values = [[`Datos consolidados desde el inicio de operaciones en esta categoria`]];

monitor.getRange('A4:D4').merge();
monitor.getRange('A4').values = [['Vision Historica']];
monitor.getRange('A5:B10').values = [
  ['Indicador', 'Valor'],
  [categoryConfig.orgLabel, historicalOrgCount],
  [categoryConfig.projectsLabel, historicalStats.projects || 0],
  [categoryConfig.investmentLabel, formatCurrency(historicalFgk)],
  [categoryConfig.alliesLabel, formatCurrency(historicalAllies)],
  [categoryConfig.beneficiaryLabel, historicalBeneficiaries],
];

monitor.getRange('A12:D12').merge();
monitor.getRange('A12').values = [['Formacion Historica']];
monitor.getRange('A13:B15').values = [
  ['Indicador', 'Valor'],
  [categoryConfig.historyOrgLabel, (formativeHistorical.byCategory?.[formativeKey]?.graduated || 0)],
  [categoryConfig.participantLabel, (formativeHistorical.byCategory?.[formativeKey]?.enrolled || 0)],
];

monitor.getRange('A17:D17').merge();
monitor.getRange('A17').values = [[`${categoryConfig.monitorLabel} ${currentYear}`]];
monitor.getRange('A18:B24').values = [
  ['Indicador', 'Valor'],
  [categoryConfig.currentOrgLabel, currentOrgCount],
  [categoryConfig.currentProjectsLabel, currentStats.projects || 0],
  [categoryConfig.investmentLabel, formatCurrency(currentFgk)],
  [categoryConfig.alliesLabel, formatCurrency(currentAllies)],
  [categoryConfig.directBeneficiariesLabel, currentBeneficiaries],
  [categoryConfig.indirectBeneficiariesLabel, currentIndirectBeneficiaries],
];

monitor.getRange('A26:D26').merge();
monitor.getRange('A26').values = [['AVANCE']];
monitor.getRange('A27:B30').values = [
  ['Indicador', 'Valor'],
  ['Promedio Global', Number(((currentTechnicalAvg + currentFinancialAvg) / 2).toFixed(2))],
  ['Avance Tecnico Global', Number(currentTechnicalAvg.toFixed(2))],
  ['Ejecucion Financiera Global', Number(currentFinancialAvg.toFixed(2))],
];
monitor.getRange('B28:B30').format.numberFormat = '0.00';

monitor.getRange('F4:G7').values = [
  ['Concepto', 'Monto'],
  ['FGK', currentFgk],
  ['Contrapartida', currentCounterpart],
  ['Aliados', currentAllies],
];
const fundsChart = monitor.charts.add('doughnut', monitor.getRange('F4:G7'));
fundsChart.title = 'Composicion de Fondos';
fundsChart.setPosition('I4', 'Q18');

monitor.getRange('F10:G13').values = [
  ['Indicador', 'Valor'],
  ['Promedio Global', Number(((currentTechnicalAvg + currentFinancialAvg) / 2).toFixed(2))],
  ['Avance Tecnico Global', Number(currentTechnicalAvg.toFixed(2))],
  ['Ejecucion Financiera Global', Number(currentFinancialAvg.toFixed(2))],
];
monitor.getRange('G11:G13').format.numberFormat = '0.00';
const advanceChart = monitor.charts.add('bar', monitor.getRange('F10:G13'));
advanceChart.title = 'AVANCE';
advanceChart.setPosition('I20', 'Q35');

historical.getRange('A1:I1').merge();
historical.getRange('A1').values = [[`Historico por edicion - ${categoryConfig.title}`]];
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
detail.getRangeByIndexes(1, 0, Math.max(projectRows.length, 1), 15).values = projectRows.length > 0 ? projectRows : [['', '', '', '', '', '', 0, 0, 0, 0, 0, '', currentYear, 0, 0]];
detail.getRange('G2:K200').format.numberFormat = '$#,##0.00';
detail.getRange('N2:O200').format.numberFormat = '0.00';

const participantsSheet = wb.worksheets.add('Participantes');
participantsSheet.showGridLines = false;

const totalParticipants = formativeParticipants.length;
const participantTableStart = 34;
const genderChartData = [
  ['Genero', 'Total'],
  ['Mujeres', genderTotals.Mujeres || 0],
  ['Hombres', genderTotals.Hombres || 0],
  ['Otros', genderTotals.Otros || 0],
];
const ageChartData = [
  ['Grupo de Edad', 'Total'],
  ['18-25', ageTotals['18-25'] || 0],
  ['26-35', ageTotals['26-35'] || 0],
  ['36-45', ageTotals['36-45'] || 0],
  ['46-55', ageTotals['46-55'] || 0],
  ['56+', ageTotals['56+'] || 0],
];
const regionChartData = [
  ['Region', 'Total'],
  ...topRegions,
];

const genderTableRange = rangeFrom(4, 0, genderChartData.length, 2);
const ageTableRange = rangeFrom(9, 0, ageChartData.length, 2);
const regionTableRange = rangeFrom(16, 0, Math.max(regionChartData.length, 2), 2);
const genderSideRange = rangeFrom(4, 3, genderChartData.length, 2);
const ageSideRange = rangeFrom(9, 3, ageChartData.length, 2);
const regionSideRange = rangeFrom(16, 3, Math.max(regionChartData.length, 2), 2);
const topRegionsSideRange = rangeFrom(11, 6, Math.max(topRegions.length, 1), 2);

participantsSheet.getRange('A1:J1').merge();
participantsSheet.getRange('A1').values = [[`Directorio de Participantes (${categoryConfig.title.replace('Vision Historica - ', '')})`]];
participantsSheet.getRange('A2:J2').merge();
participantsSheet.getRange('A2').values = [['Registro historico de todas las formaciones en este programa.']];
participantsSheet.getRange(genderTableRange).values = genderChartData;
participantsSheet.getRange(ageTableRange).values = ageChartData;
participantsSheet.getRange(regionTableRange).values = regionChartData.length > 1 ? regionChartData : [['Region', 'Total'], ['Sin datos', 0]];
participantsSheet.getRange(genderSideRange).values = [
  ['Genero', 'Total'],
  ['Mujeres', genderTotals.Mujeres || 0],
  ['Hombres', genderTotals.Hombres || 0],
  ['Otros', genderTotals.Otros || 0],
];
participantsSheet.getRange(ageSideRange).values = [
  ['Grupo de Edad', 'Total'],
  ['18-25', ageTotals['18-25'] || 0],
  ['26-35', ageTotals['26-35'] || 0],
  ['36-45', ageTotals['36-45'] || 0],
  ['46-55', ageTotals['46-55'] || 0],
  ['56+', ageTotals['56+'] || 0],
];
participantsSheet.getRange(regionSideRange).values = regionChartData.length > 1 ? regionChartData : [['Region', 'Total'], ['Sin datos', 0]];
participantsSheet.getRange('G4:H6').values = [
  ['Participantes Totales', totalParticipants],
  ['Mujeres', genderTotals.Mujeres || 0],
  ['Hombres', genderTotals.Hombres || 0],
];
participantsSheet.getRange('G8:H8').values = [['2 Participantes Totales', totalParticipants]];
participantsSheet.getRange('G10:H10').values = [['Top 5 Regiones', 'Total']];
participantsSheet.getRange(topRegionsSideRange).values = topRegions.length > 0 ? topRegions : [['Sin datos', 0]];

const genderChart = participantsSheet.charts.add('doughnut', participantsSheet.getRange(genderTableRange));
genderChart.title = 'Distribucion por Genero';
genderChart.setPosition('J4', 'P16');

const ageChart = participantsSheet.charts.add('bar', participantsSheet.getRange(ageTableRange));
ageChart.title = 'Grupos de Edad';
ageChart.setPosition('J18', 'P32');

const regionChart = participantsSheet.charts.add('bar', participantsSheet.getRange(regionTableRange));
regionChart.title = 'Top 5 Regiones';
regionChart.setPosition('J34', 'P48');

participantsSheet.getRange(`A${participantTableStart}:I${participantTableStart}`).values = [[
  'Participante',
  'Edad',
  'Genero',
  'Organizacion',
  'Programa',
  'Edicion',
  'Departamento',
  'Estado',
  'Accion',
]];
if (participantRows.length > 0) {
  participantsSheet.getRangeByIndexes(participantTableStart, 0, participantRows.length, 9).values = participantRows.map((row) => [...row, '']);
} else {
  participantsSheet.getRangeByIndexes(participantTableStart, 0, 1, 9).values = [['', 0, '', '', '', currentYear, '', '', '']];
}
const output = await SpreadsheetFile.exportXlsx(wb);
await fs.writeFile(outputPath, Buffer.from(output.data));
