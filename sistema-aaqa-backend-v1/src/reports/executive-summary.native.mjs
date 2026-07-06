import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Uso: node executive-summary.native.mjs <input.json> <output.xlsx>');
}

const input = JSON.parse((await fs.readFile(inputPath, 'utf8')).replace(/^\uFEFF/, ''));

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

const normalizeCategory = (value) => {
  const normalized = (value ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('comunitari') || normalized.includes('community') || normalized === 'dc') return 'Community';
  if (normalized.includes('fis') || normalized.includes('emprend') || normalized.includes('incub')) return 'FIS';
  return 'ONG';
};

const categoryLabel = (category) => {
  if (category === 'Community') return 'Desarrollo Comunitario';
  if (category === 'FIS') return 'Emprendimiento Social';
  return 'ONG';
};

const categoryKey = (category) => {
  if (category === 'Community') return 'community';
  if (category === 'FIS') return 'fis';
  return 'ong';
};

const clamp = (value) => Math.max(0, Math.min(100, Number.isFinite(value) ? Number(value.toFixed(2)) : 0));
const numberValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const sum = (list, key) => (list || []).reduce((acc, item) => acc + numberValue(item?.[key]), 0);
const avg = (list, key) => {
  if (!list?.length) return 0;
  return list.reduce((acc, item) => acc + numberValue(item?.[key]), 0) / list.length;
};

const normalizeGender = (value) => {
  const v = (value ?? '').toString().trim().toLowerCase();
  if (v === 'f' || v.includes('muj')) return 'Mujer';
  if (v === 'm' || v.includes('hom')) return 'Hombre';
  return 'Sin dato';
};

const safe = (value) => value ?? '';
const moneyFormat = '$#,##0.00';
const percentFormat = '0.00';

const wb = Workbook.create();

const colors = {
  navy: '#0F172A',
  blue: '#1D4ED8',
  green: '#047857',
  teal: '#0F766E',
  purple: '#6D28D9',
  slate: '#475569',
  light: '#F8FAFC',
  border: '#D9E2EC',
  header: '#E2E8F0',
};

const styleTitle = (sheet, title, subtitle) => {
  sheet.showGridLines = false;
  sheet.getRange('A1:J1').merge();
  sheet.getRange('A1').values = [[title]];
  sheet.getRange('A1').format = {
    fill: colors.navy,
    font: { bold: true, size: 18, color: '#FFFFFF' },
  };
  sheet.getRange('A2:J2').merge();
  sheet.getRange('A2').values = [[subtitle]];
  sheet.getRange('A2').format = {
    fill: colors.light,
    font: { italic: true, color: colors.slate },
  };
};

const sectionHeader = (sheet, address, title, fill = colors.teal) => {
  const range = sheet.getRange(address);
  range.merge();
  range.values = [[title]];
  range.format = {
    fill,
    font: { bold: true, color: '#FFFFFF' },
  };
};

const table = (sheet, startRow, startCol, rows, headerFill = colors.header) => {
  const safeRows = rows.length > 0 ? rows : [['Sin datos']];
  const range = sheet.getRangeByIndexes(startRow - 1, startCol, safeRows.length, safeRows[0].length);
  range.values = safeRows;
  range.format.borders = { preset: 'all', style: 'thin', color: colors.border };
  const headerRange = sheet.getRangeByIndexes(startRow - 1, startCol, 1, safeRows[0].length);
  headerRange.format = { fill: headerFill, font: { bold: true, color: colors.navy } };
  return range;
};

const projectRows = (projects, currentYear) => {
  const rows = (projects || []).map((p) => ([
    safe(p.name),
    safe(p.organization),
    categoryLabel(normalizeCategory(p.category)),
    safe(p.department),
    safe(p.municipality),
    numberValue(p.year) || currentYear,
    safe(p.status) || 'Sin estado',
    safe(p.timelineStartMonth),
    safe(p.timelineEndMonth),
    numberValue(p.amountFGK),
    numberValue(p.counterpart),
    numberValue(p.amountAllies),
    numberValue(p.beneficiaries),
    numberValue(p.indirectBeneficiaries),
    clamp(numberValue(p.technicalProgressPercentage)),
    clamp(numberValue(p.financialProgressPercentage)),
    safe(p.contact1Name),
    safe(p.contact1Role),
    safe(p.contact1DirectPhone),
    safe(p.contact1OrganizationPhone),
    safe(p.contact1Email),
    safe(p.contact2Name),
    safe(p.contact2Role),
    safe(p.contact2DirectPhone),
    safe(p.contact2OrganizationPhone),
    safe(p.contact2Email),
  ]));
  return rows.length > 0 ? rows : [[
    'Sin proyectos registrados', '', '', '', '', currentYear, '', '', '',
    0, 0, 0, 0, 0, 0, '', '', '', '', '', '', '', '', '', '',
  ]];
};

const projectHeader = [
  'Nombre del Proyecto',
  'Organizacion',
  'Categoria',
  'Departamento',
  'Municipio',
  'Edicion',
  'Estado',
  'Mes Inicio',
  'Mes Final',
  'Inversion FGK',
  'Contrapartida',
  'Fondos Aliados',
  'Beneficiarios Directos',
  'Beneficiarios Indirectos',
  'Avance Tecnico',
  'Ejecucion Financiera',
  'Contacto 1 Nombre',
  'Contacto 1 Cargo',
  'Contacto 1 Tel. Directo',
  'Contacto 1 Tel. Org.',
  'Contacto 1 Correo',
  'Contacto 2 Nombre',
  'Contacto 2 Cargo',
  'Contacto 2 Tel. Directo',
  'Contacto 2 Tel. Org.',
  'Contacto 2 Correo',
];

const participantRows = (participants, fallbackProgram, currentYear) => {
  const rows = (participants || []).map((p) => ([
    safe(p.nombre || p.name),
    numberValue(p.edad || p.age),
    normalizeGender(p.genero || p.gender),
    safe(p.organizacion_nombre || p.organization || p.ventureName),
    fallbackProgram,
    numberValue(p.year) || currentYear,
    safe(p.departamento || p.department),
    safe(p.estado_formacion || p.status),
    safe(p.proyecto_nombre || p.projectName || p.ventureName),
  ]));
  return rows.length > 0 ? rows : [['Sin participantes registrados', 0, '', '', fallbackProgram, currentYear, '', '', '']];
};

const participantHeader = [
  'Participante',
  'Edad',
  'Genero',
  'Organizacion',
  'Programa',
  'Edicion',
  'Departamento',
  'Estado',
  'Proyecto',
];

const currentYear = input.currentYear || new Date().getFullYear();
const allProjects = input.allProjects || [];
const allCurrentProjects = input.allCurrentProjects || [];
const sections = input.categorySections || [];
const globalHistorical = input.globalHistorical || { financials: {}, impact: {} };
const globalCurrent = input.globalCurrent || { financials: {}, impact: {} };
const formativeHistorical = input.formativeHistorical || {};

const home = wb.worksheets.add('Inicio');
styleTitle(home, 'Resumen Ejecutivo AAQA', `Inicio institucional, categorias y edicion vigente ${currentYear}`);

sectionHeader(home, 'A4:C4', 'Vision Institucional', colors.navy);
table(home, 5, 0, [
  ['Indicador', 'Valor'],
  ['Aporte FGK Total Historico', numberValue(globalHistorical.financials?.fgk)],
  ['Aporte Aliados Total', numberValue(globalHistorical.financials?.aliados)],
  ['Contrapartida Org.', numberValue(globalHistorical.financials?.contrapartida)],
  ['Impacto Financiero Total', numberValue(globalHistorical.financials?.fgk) + numberValue(globalHistorical.financials?.aliados) + numberValue(globalHistorical.financials?.contrapartida)],
  ['Proyectos Historicos', numberValue(globalHistorical.impact?.projects)],
  ['Org. Aliadas', numberValue(globalHistorical.impact?.orgs)],
  ['Beneficiarios Est.', numberValue(globalHistorical.impact?.beneficiaries)],
]);
home.getRange('B6:B9').format.numberFormat = moneyFormat;

sectionHeader(home, 'E4:G4', `Edicion Vigente ${currentYear}`, colors.blue);
table(home, 5, 4, [
  ['Indicador', 'Valor'],
  ['Inversion FGK', numberValue(globalCurrent.financials?.fgk)],
  ['Fondos Aliados', numberValue(globalCurrent.financials?.aliados)],
  ['Contrapartida', numberValue(globalCurrent.financials?.contrapartida)],
  ['Proyectos', numberValue(globalCurrent.impact?.projects)],
  ['Org. Aliadas', numberValue(globalCurrent.impact?.orgs)],
  ['Beneficiarios', numberValue(globalCurrent.impact?.beneficiaries)],
]);
home.getRange('F6:F8').format.numberFormat = moneyFormat;

sectionHeader(home, 'A15:D15', 'Impacto por Categoria', colors.purple);
const categoryImpactRows = [
  ['Categoria', 'Proyectos', 'Inversion FGK', 'Beneficiarios'],
  ...sections.map((section) => [
    section.title,
    numberValue(section.currentStats?.projects),
    numberValue(section.currentStats?.investment),
    (section.currentProjects || []).reduce((acc, p) => acc + numberValue(p.beneficiaries) + numberValue(p.indirectBeneficiaries), 0),
  ]),
];
table(home, 16, 0, categoryImpactRows);
home.getRange('C17:C25').format.numberFormat = moneyFormat;
const impactChart = home.charts.add('bar', home.getRange(`A16:C${16 + Math.max(1, sections.length)}`));
impactChart.title = 'Impacto por Categoria';
impactChart.setPosition('F15', 'M30');

sectionHeader(home, 'A31:D31', 'Composicion de Fondos Global', colors.green);
table(home, 32, 0, [
  ['Concepto', 'Monto'],
  ['FGK', numberValue(globalHistorical.financials?.fgk)],
  ['Contrapartida', numberValue(globalHistorical.financials?.contrapartida)],
  ['Aliados', numberValue(globalHistorical.financials?.aliados)],
]);
home.getRange('B33:B35').format.numberFormat = moneyFormat;
const fundsChart = home.charts.add('doughnut', home.getRange('A32:B35'));
fundsChart.title = 'Composicion de Fondos';
fundsChart.setPosition('F32', 'M48');

sectionHeader(home, 'A50:Z50', 'Proyectos Registrados');
table(home, 51, 0, [projectHeader, ...projectRows(allProjects, currentYear)]);
home.getRange('J52:N500').format.numberFormat = moneyFormat;
home.getRange('O52:P500').format.numberFormat = percentFormat;

for (const section of sections) {
  const sheet = wb.worksheets.add(section.title);
  styleTitle(sheet, `Vision Historica - ${section.title}`, `Datos consolidados y monitoreo de la edicion vigente ${currentYear}`);

  const historicalProjects = section.historicalProjects || [];
  const currentProjects = section.currentProjects || [];
  const currentFgk = numberValue(section.currentStats?.investment);
  const currentCounterpart = sum(currentProjects, 'counterpart');
  const currentAllies = sum(currentProjects, 'amountAllies');
  const historicalFgk = sum(historicalProjects, 'amountFGK');
  const historicalAllies = sum(historicalProjects, 'amountAllies');
  const historicalBeneficiaries = historicalProjects.reduce((acc, p) => acc + numberValue(p.beneficiaries) + numberValue(p.indirectBeneficiaries), 0);
  const currentBeneficiaries = currentProjects.reduce((acc, p) => acc + numberValue(p.beneficiaries) + numberValue(p.indirectBeneficiaries), 0);
  const currentTechnical = clamp(avg(currentProjects, 'technicalProgressPercentage'));
  const currentFinancial = clamp(avg(currentProjects, 'financialProgressPercentage'));

  sectionHeader(sheet, 'A4:C4', 'Vision Historica', colors.teal);
  table(sheet, 5, 0, [
    ['Indicador', 'Valor'],
    ['Organizaciones / Emprendimientos', numberValue(section.historicalStats?.orgs || section.historicalStats?.ventures)],
    ['Proyectos Totales', numberValue(section.historicalStats?.projects)],
    ['Inversion FGK', historicalFgk],
    ['Fondos Aliados', historicalAllies],
    ['Beneficiarios Est.', historicalBeneficiaries],
    ['Participantes Historicos', numberValue(section.formativeHistorical?.enrolled)],
  ]);
  sheet.getRange('B8:B9').format.numberFormat = moneyFormat;

  sectionHeader(sheet, 'E4:G4', `Monitor ${currentYear}`, colors.blue);
  table(sheet, 5, 4, [
    ['Indicador', 'Valor'],
    ['Proyectos', numberValue(section.currentStats?.projects)],
    ['Inversion FGK', currentFgk],
    ['Fondos Aliados', currentAllies],
    ['Beneficiarios', currentBeneficiaries],
    ['Avance Tecnico Global', currentTechnical],
    ['Ejecucion Financiera Global', currentFinancial],
  ]);
  sheet.getRange('F7:F8').format.numberFormat = moneyFormat;
  sheet.getRange('F10:F11').format.numberFormat = percentFormat;

  table(sheet, 5, 8, [
    ['Concepto', 'Monto'],
    ['FGK', currentFgk],
    ['Contrapartida', currentCounterpart],
    ['Aliados', currentAllies],
  ]);
  sheet.getRange('J6:J8').format.numberFormat = moneyFormat;
  const categoryFundsChart = sheet.charts.add('doughnut', sheet.getRange('I5:J8'));
  categoryFundsChart.title = 'Composicion de Fondos';
  categoryFundsChart.setPosition('L4', 'S18');

  table(sheet, 13, 8, [
    ['Indicador', 'Valor'],
    ['Avance Tecnico Global', currentTechnical],
    ['Ejecucion Financiera Global', currentFinancial],
  ]);
  sheet.getRange('J14:J15').format.numberFormat = percentFormat;
  const advanceChart = sheet.charts.add('bar', sheet.getRange('I13:J15'));
  advanceChart.title = 'AVANCE';
  advanceChart.setPosition('L20', 'S34');

  sectionHeader(sheet, 'A18:Z18', 'Proyectos de la Categoria');
  table(sheet, 19, 0, [projectHeader, ...projectRows(historicalProjects, currentYear)]);
  sheet.getRange('J20:N600').format.numberFormat = moneyFormat;
  sheet.getRange('O20:P600').format.numberFormat = percentFormat;

  const participantStart = 22 + Math.max(1, historicalProjects.length);
  sectionHeader(sheet, `A${participantStart}:I${participantStart}`, 'Directorio de Participantes');
  table(sheet, participantStart + 1, 0, [participantHeader, ...participantRows(section.participants, section.title, currentYear)]);
}

const output = await SpreadsheetFile.exportXlsx(wb);
await fs.writeFile(outputPath, Buffer.from(output.data));
