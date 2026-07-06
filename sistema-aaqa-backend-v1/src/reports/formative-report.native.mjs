import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Uso: node formative-report.native.mjs <input.json> <output.xlsx>');
}

const input = JSON.parse((await fs.readFile(inputPath, 'utf8')).replace(/^\uFEFF/, ''));

const numberValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const safe = (value) => value ?? '';
const normalizeGender = (value) => {
  const v = (value ?? '').toString().trim().toLowerCase();
  if (v === 'f' || v.includes('muj')) return 'Mujer';
  if (v === 'm' || v.includes('hom')) return 'Hombre';
  return 'Sin dato';
};

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

const wb = Workbook.create();

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

const currentYear = input.currentYear || new Date().getFullYear();
const formativeData = input.formativeData || {};
const formativeCurrent = input.formativeCurrent || {};
const participants = input.participants || [];
const cortes = input.cortes || [];
const fisParticipants = input.fisParticipants || [];

const summary = wb.worksheets.add('Resumen Formativo');
styleTitle(summary, 'Reporte Formativo', `Consolidado historico y edicion vigente ${currentYear}`);

sectionHeader(summary, 'A4:C4', 'Metricas Historicas', colors.teal);
table(summary, 5, 0, [
  ['Indicador', 'Valor'],
  ['Total Inscritos', numberValue(formativeData.totalEnrolled)],
  ['Total Graduados', numberValue(formativeData.totalGraduated)],
  ['Tasa de Retencion', numberValue(formativeData.retentionRate)],
  ['Mujeres', numberValue(formativeData.byGender?.F)],
  ['Hombres', numberValue(formativeData.byGender?.M)],
]);
summary.getRange('B8:B8').format.numberFormat = '0.00';

sectionHeader(summary, 'E4:G4', `Edicion ${currentYear}`, colors.blue);
table(summary, 5, 4, [
  ['Indicador', 'Valor'],
  ['Total Inscritos', numberValue(formativeCurrent.totalEnrolled)],
  ['Total Graduados', numberValue(formativeCurrent.totalGraduated)],
  ['Tasa de Retencion', numberValue(formativeCurrent.retentionRate)],
  ['Mujeres', numberValue(formativeCurrent.byGender?.F)],
  ['Hombres', numberValue(formativeCurrent.byGender?.M)],
]);
summary.getRange('F8:F8').format.numberFormat = '0.00';

sectionHeader(summary, 'A13:D13', 'Formacion por Categoria', colors.purple);
const categoryRows = [
  ['Categoria', 'Inscritos', 'Graduados'],
  ['ONG', numberValue(formativeData.byCategory?.ong?.enrolled), numberValue(formativeData.byCategory?.ong?.graduated)],
  ['Desarrollo Comunitario', numberValue(formativeData.byCategory?.community?.enrolled), numberValue(formativeData.byCategory?.community?.graduated)],
  ['Emprendimiento Social', numberValue(formativeData.byCategory?.fis?.enrolled), numberValue(formativeData.byCategory?.fis?.graduated)],
];
table(summary, 14, 0, categoryRows);
const categoryChart = summary.charts.add('bar', summary.getRange('A14:C17'));
categoryChart.title = 'Formacion por Categoria';
categoryChart.setPosition('F13', 'M30');

sectionHeader(summary, 'A32:C32', 'Distribucion por Genero', colors.green);
table(summary, 33, 0, [
  ['Genero', 'Total'],
  ['Mujeres', numberValue(formativeData.byGender?.F)],
  ['Hombres', numberValue(formativeData.byGender?.M)],
]);
const genderChart = summary.charts.add('doughnut', summary.getRange('A33:B35'));
genderChart.title = 'Distribucion por Genero';
genderChart.setPosition('F32', 'M48');

const participantSheet = wb.worksheets.add('Participantes');
styleTitle(participantSheet, 'Directorio de Participantes', 'Registro historico de todas las formaciones vinculadas a proyectos.');
table(participantSheet, 4, 0, [[
  'Participante',
  'Edad',
  'Genero',
  'Organizacion',
  'Proyecto',
  'Categoria',
  'Edicion',
  'Departamento',
  'Estado',
], ...((participants.length > 0 ? participants : [{}]).map((p) => [
  safe(p.nombre),
  numberValue(p.edad),
  normalizeGender(p.genero),
  safe(p.organizacion_nombre),
  safe(p.proyecto_nombre),
  safe(p.category),
  numberValue(p.year) || currentYear,
  safe(p.departamento),
  safe(p.estado_formacion),
]))]);

const cortesSheet = wb.worksheets.add('Cortes ADESCOS');
styleTitle(cortesSheet, 'Cortes Formativas / ADESCOS', 'Listado de cortes, ADESCOS y participantes comunitarios.');
const corteRows = [];
for (const corte of cortes) {
  const adescos = Array.isArray(corte.adescos) && corte.adescos.length > 0 ? corte.adescos : [{}];
  for (const adesco of adescos) {
    const parts = Array.isArray(adesco.participants) && adesco.participants.length > 0 ? adesco.participants : [{}];
    for (const participant of parts) {
      corteRows.push([
        safe(corte.name),
        numberValue(corte.year) || currentYear,
        safe(corte.allyName),
        safe(corte.location),
        safe(corte.startDate),
        safe(corte.endDate),
        safe(corte.status),
        safe(adesco.name),
        numberValue(adesco.participantsCount),
        numberValue(adesco.graduatesCount),
        numberValue(adesco.maleCount),
        numberValue(adesco.femaleCount),
        safe(participant.name),
        safe(participant.role),
        safe(participant.phone),
        safe(participant.district),
        safe(participant.department),
        normalizeGender(participant.gender),
      ]);
    }
  }
}
table(cortesSheet, 4, 0, [[
  'Nombre Corte',
  'Edicion',
  'Aliado / Coordinador',
  'Lugar de Formacion',
  'Fecha Inicio',
  'Fecha Fin',
  'Estado',
  'Nombre ADESCO',
  'Inscritos',
  'Graduados',
  'Hombres',
  'Mujeres',
  'Participante',
  'Cargo',
  'Contacto',
  'Distrito',
  'Departamento',
  'Genero',
], ...(corteRows.length > 0 ? corteRows : [['Sin cortes registrados', currentYear, '', '', '', '', '', '', 0, 0, 0, 0, '', '', '', '', '', '']])]);

const fisSheet = wb.worksheets.add('Emprendimiento Social');
styleTitle(fisSheet, 'Participantes de Emprendimiento Social', 'Incubadora, formacion y registros vinculados a emprendimientos.');
table(fisSheet, 4, 0, [[
  'Participante',
  'Edicion',
  'Programa',
  'Sede',
  'Genero',
  'Edad',
  'Emprendimiento / Proyecto',
  'Departamento',
  'Estado',
  'Origen',
  'Observaciones',
], ...((fisParticipants.length > 0 ? fisParticipants : [{}]).map((p) => [
  safe(p.name),
  numberValue(p.year) || currentYear,
  safe(p.program),
  safe(p.campus),
  normalizeGender(p.gender),
  numberValue(p.age),
  safe(p.ventureName),
  safe(p.department),
  safe(p.status),
  safe(p.source),
  safe(p.observations),
]))]);

const output = await SpreadsheetFile.exportXlsx(wb);
await fs.writeFile(outputPath, Buffer.from(output.data));
