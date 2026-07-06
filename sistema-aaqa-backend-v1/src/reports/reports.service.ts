import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { EntityManager } from 'typeorm';
import * as XLSX from 'xlsx';
import { DashboardService } from '../dashboard/dashboard.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
    private readonly dashboardService: DashboardService,
  ) {}

  private normalizeCategory(category: any): 'ONG' | 'Community' | 'FIS' {
    const value = (category ?? '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (value.includes('comunitari') || value.includes('community') || value === 'dc') {
      return 'Community';
    }
    if (value.includes('fis') || value.includes('emprend') || value.includes('incub')) {
      return 'FIS';
    }
    return 'ONG';
  }

  private formatCurrency(value: number | string | null | undefined) {
    const numeric = typeof value === 'number' ? value : parseFloat((value ?? '0').toString());
    return `$${(Number.isFinite(numeric) ? numeric : 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private clampPercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Number(value.toFixed(2))));
  }

  private buildBar(value: number, max: number, width = 18) {
    const safeMax = max > 0 ? max : 1;
    const ratio = Math.max(0, Math.min(1, value / safeMax));
    const filled = Math.max(1, Math.round(ratio * width));
    return '█'.repeat(filled).padEnd(width, '░');
  }

  private async generateCategoryExcelNative(category: string, year?: number): Promise<Buffer> {
    const normalizedCategory = this.normalizeCategory(category);
    const currentYear = year || new Date().getFullYear();
    const currentProjects = await this.getProjects({ category: normalizedCategory, year });
    const historicalProjects = await this.getProjects({ category: normalizedCategory });
    const currentCategoryStats = await this.dashboardService.getCategoriesData(year);
    const historicalCategoryStats = await this.dashboardService.getCategoriesData();
    const formativeCurrent = await this.dashboardService.getFormativeData(year);
    const formativeHistorical = await this.dashboardService.getFormativeData();
    const formativeParticipants = await this.getFormativeParticipants({ category: normalizedCategory, year });

    const payload = {
      category,
      year,
      currentYear,
      currentProjects,
      historicalProjects,
      currentStats: normalizedCategory === 'ONG'
        ? currentCategoryStats.ong
        : normalizedCategory === 'Community'
          ? currentCategoryStats.community
          : currentCategoryStats.fis,
      historicalStats: normalizedCategory === 'ONG'
        ? historicalCategoryStats.ong
        : normalizedCategory === 'Community'
          ? historicalCategoryStats.community
          : historicalCategoryStats.fis,
      formativeCurrent,
      formativeHistorical,
      formativeParticipants,
    };

    const inputFile = path.join(os.tmpdir(), `category-export-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const outputFile = path.join(os.tmpdir(), `category-export-${Date.now()}-${Math.random().toString(16).slice(2)}.xlsx`);
    const scriptPath = path.join(process.cwd(), 'src', 'reports', 'category-excel.native.mjs');
    const nodeExe = 'C:\\Users\\DELL\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';

    await fs.writeFile(inputFile, JSON.stringify(payload), 'utf8');
    try {
      const result = spawnSync(nodeExe, [scriptPath, inputFile, outputFile], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (result.status !== 0) {
        throw new Error((result.stderr || result.stdout || 'No se pudo generar el Excel con graficos nativos').toString());
      }
      const buffer = await fs.readFile(outputFile);
      return Buffer.from(buffer);
    } finally {
      await fs.unlink(inputFile).catch(() => undefined);
      await fs.unlink(outputFile).catch(() => undefined);
    }
  }

  private async runNativeExcelScript(scriptName: string, payload: any, prefix: string): Promise<Buffer> {
    const inputFile = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
    const outputFile = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}.xlsx`);
    const scriptPath = path.join(process.cwd(), 'src', 'reports', scriptName);
    const nodeExe = 'C:\\Users\\DELL\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\bin\\node.exe';

    await fs.writeFile(inputFile, JSON.stringify(payload), 'utf8');
    try {
      const result = spawnSync(nodeExe, [scriptPath, inputFile, outputFile], {
        encoding: 'utf8',
        windowsHide: true,
      });
      if (result.status !== 0) {
        throw new Error((result.stderr || result.stdout || 'No se pudo generar el Excel nativo').toString());
      }
      const buffer = await fs.readFile(outputFile);
      return Buffer.from(buffer);
    } finally {
      await fs.unlink(inputFile).catch(() => undefined);
      await fs.unlink(outputFile).catch(() => undefined);
    }
  }

  private async getCurrentReportYear(): Promise<number> {
    const current = await this.entityManager.query(
      `SELECT año AS year FROM ediciones WHERE es_actual = TRUE ORDER BY año DESC LIMIT 1`,
    );
    if (current?.[0]?.year) return Number(current[0].year);

    const latest = await this.entityManager.query(`SELECT MAX(año) AS year FROM ediciones`);
    if (latest?.[0]?.year) return Number(latest[0].year);

    return new Date().getFullYear();
  }

  private categoryTitle(category: 'ONG' | 'Community' | 'FIS') {
    if (category === 'Community') return 'Desarrollo Comunitario';
    if (category === 'FIS') return 'Emprendimiento Social';
    return 'ONG';
  }

  private categoryDataKey(category: 'ONG' | 'Community' | 'FIS'): 'ong' | 'community' | 'fis' {
    if (category === 'Community') return 'community';
    if (category === 'FIS') return 'fis';
    return 'ong';
  }

  private async buildExecutiveReportPayload() {
    const currentYear = await this.getCurrentReportYear();
    const categories: Array<'ONG' | 'Community' | 'FIS'> = ['ONG', 'Community', 'FIS'];

    const [
      globalHistorical,
      globalCurrent,
      categoriesHistorical,
      categoriesCurrent,
      formativeHistorical,
      formativeCurrent,
      allProjects,
      allCurrentProjects,
      cortes,
    ] = await Promise.all([
      this.dashboardService.getGlobalData(),
      this.dashboardService.getGlobalData(currentYear),
      this.dashboardService.getCategoriesData(),
      this.dashboardService.getCategoriesData(currentYear),
      this.dashboardService.getFormativeData(),
      this.dashboardService.getFormativeData(currentYear),
      this.dashboardService.getProjects({}),
      this.dashboardService.getProjects({ year: currentYear }),
      this.dashboardService.getCommunityCortes().catch(() => []),
    ]);

    const participantsByCategory: Record<string, any[]> = {};
    await Promise.all(categories.map(async (category) => {
      participantsByCategory[category] = await this.getFormativeParticipants({ category });
    }));

    const categorySections = categories.map((category) => {
      const key = this.categoryDataKey(category);
      const historicalProjects = allProjects.filter((project: any) => this.normalizeCategory(project.category) === category);
      const currentProjects = allCurrentProjects.filter((project: any) => this.normalizeCategory(project.category) === category);
      return {
        key: category,
        title: this.categoryTitle(category),
        historicalStats: (categoriesHistorical as any)[key],
        currentStats: (categoriesCurrent as any)[key],
        historicalProjects,
        currentProjects,
        participants: participantsByCategory[category] || [],
        formativeHistorical: (formativeHistorical as any).byCategory?.[key] || { enrolled: 0, graduated: 0 },
        formativeCurrent: (formativeCurrent as any).byCategory?.[key] || { enrolled: 0, graduated: 0 },
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      currentYear,
      globalHistorical,
      globalCurrent,
      categoriesHistorical,
      categoriesCurrent,
      formativeHistorical,
      formativeCurrent,
      allProjects,
      allCurrentProjects,
      categorySections,
      cortes,
    };
  }

  async generateSummaryExcel(): Promise<Buffer> {
    const payload = await this.buildExecutiveReportPayload();
    return this.runNativeExcelScript('executive-summary.native.mjs', payload, 'executive-summary');

    // Obtener datos globales desde dashboardService para que incluya las modificaciones manuales
    const globalData = await this.dashboardService.getGlobalData();
    const categoriesData = await this.dashboardService.getCategoriesData();
    const formativeData = await this.dashboardService.getFormativeData();

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen Financiero
    const financialSheet = XLSX.utils.json_to_sheet([
      { Indicador: 'Aporte FGK Total', Valor: globalData.financials.fgk },
      { Indicador: 'Aporte Aliados Total', Valor: globalData.financials.aliados },
      { Indicador: 'Contrapartida Total', Valor: globalData.financials.contrapartida },
      { Indicador: 'Inversión Total', Valor: globalData.financials.fgk + globalData.financials.aliados + globalData.financials.contrapartida },
    ]);
    XLSX.utils.book_append_sheet(wb, financialSheet, 'Resumen Financiero');

    // Hoja 2: Impacto General
    const impactSheet = XLSX.utils.json_to_sheet([
      { Indicador: 'Total Proyectos', Valor: globalData.impact.projects },
      { Indicador: 'Organizaciones Aliadas', Valor: globalData.impact.orgs },
      { Indicador: 'Beneficiarios', Valor: globalData.impact.beneficiaries },
    ]);
    XLSX.utils.book_append_sheet(wb, impactSheet, 'Impacto General');

    // Hoja 3: Categorías
    const categoriesSheet = XLSX.utils.json_to_sheet([
      { Categoría: 'ONG', Inversión: categoriesData.ong.investment, Organizaciones: categoriesData.ong.orgs, Proyectos: categoriesData.ong.projects },
      { Categoría: 'Desarrollo Comunitario', Inversión: categoriesData.community.investment, Organizaciones: categoriesData.community.orgs, Proyectos: categoriesData.community.projects },
      { Categoría: 'Emprendimiento Social', Inversión: categoriesData.fis.investment, Emprendimientos: categoriesData.fis.ventures, Proyectos: categoriesData.fis.projects },
    ]);
    XLSX.utils.book_append_sheet(wb, categoriesSheet, 'Categorías');

    // Hoja 4: Formación
    const formativeSheet = XLSX.utils.json_to_sheet([
      { Indicador: 'Total Inscritos', Valor: formativeData.totalEnrolled },
      { Indicador: 'Total Graduados', Valor: formativeData.totalGraduated },
      { Indicador: 'Tasa de Retención', Valor: `${formativeData.retentionRate.toFixed(1)}%` },
      { Indicador: 'Mujeres', Valor: formativeData.byGender.F },
      { Indicador: 'Hombres', Valor: formativeData.byGender.M },
    ]);
    XLSX.utils.book_append_sheet(wb, formativeSheet, 'Formación');

    // Hoja 5: Proyectos
    const projects = await this.getProjects();
    const projectsSheet = XLSX.utils.json_to_sheet(projects.map(p => ({
      ID: p.id,
      Nombre: p.name,
      Organización: p.organization,
      Categoría: p.category,
      Departamento: p.department,
      'Inversión FGK': p.amountFGK,
      Beneficiarios: p.beneficiaries,
      Estado: p.status,
      Año: p.year,
    })));
    XLSX.utils.book_append_sheet(wb, projectsSheet, 'Proyectos');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async generateSummaryPdf(): Promise<Buffer> {
    {
      const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const payload = await this.buildExecutiveReportPayload();
      const pageSize: [number, number] = [842, 595];
      const navy = rgb(0.06, 0.09, 0.16);
      const blue = rgb(0.05, 0.35, 0.78);
      const green = rgb(0.02, 0.48, 0.34);
      const muted = rgb(0.38, 0.45, 0.55);
      const border = rgb(0.86, 0.89, 0.93);
      const money = (value: any) => this.formatCurrency(Number(value) || 0);
      const write = (page: any, value: any, x: number, y: number, size = 10, font = regular, color = navy) => {
        page.drawText((value ?? '').toString().slice(0, 105), { x, y, size, font, color });
      };
      const card = (page: any, title: string, value: string, x: number, y: number, w: number, h: number, color = blue) => {
        page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.97, 0.98, 1), borderColor: border, borderWidth: 1 });
        write(page, title, x + 12, y + h - 18, 8, bold, muted);
        write(page, value, x + 12, y + 15, 15, bold, color);
      };
      const header = (title: string, subtitle: string) => {
        const page = pdfDoc.addPage(pageSize);
        page.drawRectangle({ x: 0, y: 535, width: 842, height: 60, color: navy });
        write(page, title, 40, 565, 18, bold, rgb(1, 1, 1));
        write(page, subtitle, 40, 545, 9, regular, rgb(0.82, 0.88, 0.96));
        write(page, `Generado: ${new Date(payload.generatedAt).toLocaleString('es-SV')}`, 650, 545, 8, regular, rgb(0.82, 0.88, 0.96));
        return page;
      };
      const projectTable = (page: any, projects: any[], startY: number) => {
        const headers = ['Proyecto', 'Organizacion', 'Edicion', 'FGK', 'Aliados', 'Benef.', 'Estado'];
        const widths = [160, 145, 55, 80, 80, 65, 95];
        let x = 40;
        headers.forEach((headerText, index) => {
          page.drawRectangle({ x, y: startY, width: widths[index], height: 22, color: rgb(0.93, 0.95, 0.98), borderColor: border, borderWidth: 1 });
          write(page, headerText, x + 5, startY + 7, 8, bold, navy);
          x += widths[index];
        });
        let y = startY - 22;
        const visibleProjects = projects.slice(0, 11);
        if (visibleProjects.length === 0) {
          page.drawRectangle({ x: 40, y, width: widths.reduce((a, b) => a + b, 0), height: 26, color: rgb(1, 1, 1), borderColor: border, borderWidth: 1 });
          write(page, 'No hay proyectos registrados para esta seccion.', 50, y + 9, 8, regular, muted);
          return;
        }
        visibleProjects.forEach((project: any) => {
          x = 40;
          const row = [
            project.name || '',
            project.organization || '',
            `${project.year || ''}`,
            money(project.amountFGK),
            money(project.amountAllies),
            `${Number(project.beneficiaries || 0).toLocaleString('en-US')}`,
            project.status || 'Sin estado',
          ];
          row.forEach((cell, index) => {
            page.drawRectangle({ x, y, width: widths[index], height: 22, color: rgb(1, 1, 1), borderColor: border, borderWidth: 1 });
            write(page, cell, x + 5, y + 7, 7.5, regular, navy);
            x += widths[index];
          });
          y -= 22;
        });
        if (projects.length > visibleProjects.length) {
          write(page, `+ ${projects.length - visibleProjects.length} proyectos adicionales disponibles en el Excel ejecutivo.`, 40, y - 4, 8, regular, muted);
        }
      };

      const historicalTotal = (payload.globalHistorical.financials.fgk || 0)
        + (payload.globalHistorical.financials.aliados || 0)
        + (payload.globalHistorical.financials.contrapartida || 0);
      const home = header('Resumen Ejecutivo AAQA', `Inicio institucional y consolidado global - Edicion vigente ${payload.currentYear}`);
      card(home, 'Aporte FGK historico', money(payload.globalHistorical.financials.fgk), 40, 460, 170, 52, green);
      card(home, 'Aporte aliados historico', money(payload.globalHistorical.financials.aliados), 225, 460, 170, 52, green);
      card(home, 'Contrapartida org.', money(payload.globalHistorical.financials.contrapartida), 410, 460, 170, 52, green);
      card(home, 'Impacto financiero total', money(historicalTotal), 595, 460, 205, 52, blue);
      card(home, 'Proyectos historicos', `${payload.globalHistorical.impact.projects || 0}`, 40, 385, 170, 52);
      card(home, 'Organizaciones aliadas', `${payload.globalHistorical.impact.orgs || 0}`, 225, 385, 170, 52);
      card(home, 'Beneficiarios estimados', `${Number(payload.globalHistorical.impact.beneficiaries || 0).toLocaleString('en-US')}`, 410, 385, 170, 52);
      card(home, 'Participantes formativos', `${payload.formativeHistorical.totalEnrolled || 0}`, 595, 385, 205, 52);
      write(home, 'Proyectos de la edicion vigente', 40, 340, 13, bold, navy);
      projectTable(home, payload.allCurrentProjects || [], 310);

      for (const section of payload.categorySections) {
        const page = header(section.title, `Monitor de la edicion vigente ${payload.currentYear} y vision historica`);
        const currentFgk = Number(section.currentStats?.investment || 0);
        const currentAllies = section.currentProjects.reduce((acc: number, project: any) => acc + (Number(project.amountAllies) || 0), 0);
        const currentCounterpart = section.currentProjects.reduce((acc: number, project: any) => acc + (Number(project.counterpart) || 0), 0);
        const direct = section.currentProjects.reduce((acc: number, project: any) => acc + (Number(project.beneficiaries) || 0), 0);
        const indirect = section.currentProjects.reduce((acc: number, project: any) => acc + (Number(project.indirectBeneficiaries) || 0), 0);
        const techAvg = section.currentProjects.length
          ? this.clampPercent(section.currentProjects.reduce((acc: number, project: any) => acc + (Number(project.technicalProgressPercentage) || 0), 0) / section.currentProjects.length)
          : 0;
        const finAvg = section.currentProjects.length
          ? this.clampPercent(section.currentProjects.reduce((acc: number, project: any) => acc + (Number(project.financialProgressPercentage) || 0), 0) / section.currentProjects.length)
          : 0;
        card(page, 'Proyectos', `${section.currentStats?.projects || 0}`, 40, 460, 170, 52);
        card(page, 'Inversion FGK', money(currentFgk), 225, 460, 170, 52, green);
        card(page, 'Fondos aliados', money(currentAllies), 410, 460, 170, 52, green);
        card(page, 'Beneficiarios', `${(direct + indirect).toLocaleString('en-US')}`, 595, 460, 205, 52);
        card(page, 'Contrapartida', money(currentCounterpart), 40, 385, 170, 52, green);
        card(page, 'Avance tecnico global', `${techAvg.toFixed(2)}%`, 225, 385, 170, 52, blue);
        card(page, 'Ejecucion financiera', `${finAvg.toFixed(2)}%`, 410, 385, 170, 52, blue);
        card(page, 'Participantes historicos', `${section.participants.length}`, 595, 385, 205, 52);
        write(page, 'Proyectos de la edicion vigente', 40, 340, 13, bold, navy);
        projectTable(page, section.currentProjects || [], 310);
      }

      const appendProjectAppendix = (title: string, projects: any[]) => {
        const pageProjects = projects.length > 0 ? projects : [];
        const chunks: any[][] = [];
        for (let index = 0; index < pageProjects.length; index += 11) {
          chunks.push(pageProjects.slice(index, index + 11));
        }
        if (chunks.length === 0) chunks.push([]);
        chunks.forEach((chunk, index) => {
          const page = header(title, `Listado completo de proyectos - pagina ${index + 1} de ${chunks.length}`);
          projectTable(page, chunk, 470);
        });
      };

      appendProjectAppendix('Anexo General - Proyectos', payload.allProjects || []);
      for (const section of payload.categorySections) {
        appendProjectAppendix(`Anexo ${section.title} - Proyectos`, section.historicalProjects || []);
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    }
    // Para PDF, necesitarías una librería como PDFKit
    // Por ahora, devolvemos un mensaje indicando que requiere implementación
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const globalData = await this.dashboardService.getGlobalData();
    const totalInvestment = globalData.financials.fgk + globalData.financials.aliados + globalData.financials.contrapartida;
    
    page.drawText('RESUMEN EJECUTIVO - AAQA', { x: 50, y: 750, size: 18, font });
    page.drawText(`Inversión Total: $${totalInvestment.toLocaleString()}`, { x: 50, y: 700, size: 12 });
    page.drawText(`Aporte FGK: $${globalData.financials.fgk.toLocaleString()}`, { x: 50, y: 680, size: 12 });
    page.drawText(`Aporte Aliados: $${globalData.financials.aliados.toLocaleString()}`, { x: 50, y: 660, size: 12 });
    page.drawText(`Total Proyectos: ${globalData.impact.projects}`, { x: 50, y: 640, size: 12 });
    page.drawText(`Organizaciones Aliadas: ${globalData.impact.orgs}`, { x: 50, y: 620, size: 12 });
    page.drawText(`Beneficiarios: ${globalData.impact.beneficiaries.toLocaleString()}`, { x: 50, y: 600, size: 12 });
    page.drawText(`Fecha de generación: ${new Date().toLocaleString()}`, { x: 50, y: 50, size: 10 });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generateCategoryExcel(category: string, year?: number): Promise<Buffer> {
    return this.generateCategoryExcelNative(category, year);
    const normalizedCategory = this.normalizeCategory(category);
    const currentYear = year || new Date().getFullYear();
    const currentProjects = await this.getProjects({ category: normalizedCategory, year });
    const historicalProjects = await this.getProjects({ category: normalizedCategory });
    const currentCategoryStats = await this.dashboardService.getCategoriesData(year);
    const historicalCategoryStats = await this.dashboardService.getCategoriesData();
    const formativeCurrent = await this.dashboardService.getFormativeData(year);
    const formativeHistorical = await this.dashboardService.getFormativeData();

    const categoryConfig = normalizedCategory === 'ONG'
      ? {
          title: 'Visión Histórica - ONG',
          orgLabel: 'Orgs. Apoyadas',
          historyOrgLabel: 'Orgs. Formadas',
          projectsLabel: 'Proyectos Totales',
          investmentLabel: 'Inversión FGK',
          alliesLabel: 'Fondos Aliados',
          beneficiariesLabel: 'Beneficiarios Est.',
          participantLabel: 'Participantes (Histórico)',
          monitorLabel: 'Monitor: Edición Vigente',
        }
      : normalizedCategory === 'Community'
        ? {
            title: 'Visión Histórica - Desarrollo Comunitario',
            orgLabel: 'ADESCOS',
            historyOrgLabel: 'ADESCOS Formadas',
            projectsLabel: 'Proyectos Totales',
            investmentLabel: 'Inversión FGK',
            alliesLabel: 'Fondos Aliados',
            beneficiariesLabel: 'Beneficiarios Est.',
            participantLabel: 'Participantes (Histórico)',
            monitorLabel: 'Monitor: Edición Vigente',
          }
        : {
            title: 'Visión Histórica - Emprendimiento Social',
            orgLabel: 'Emprendimientos',
            historyOrgLabel: 'Emprendimientos Formados',
            projectsLabel: 'Proyectos Totales',
            investmentLabel: 'Inversión FGK',
            alliesLabel: 'Fondos Aliados',
            beneficiariesLabel: 'Beneficiarios Est.',
            participantLabel: 'Participantes (Histórico)',
            monitorLabel: 'Monitor: Edición Vigente',
          };

    const currentStats = normalizedCategory === 'ONG'
      ? currentCategoryStats.ong
      : normalizedCategory === 'Community'
        ? currentCategoryStats.community
        : currentCategoryStats.fis;
    const historicalStats = normalizedCategory === 'ONG'
      ? historicalCategoryStats.ong
      : normalizedCategory === 'Community'
        ? historicalCategoryStats.community
        : historicalCategoryStats.fis;
    const formativeCurrentCategory = normalizedCategory === 'ONG'
      ? formativeCurrent.byCategory.ong
      : normalizedCategory === 'Community'
        ? formativeCurrent.byCategory.community
        : formativeCurrent.byCategory.fis;
    const formativeHistoricalCategory = normalizedCategory === 'ONG'
      ? formativeHistorical.byCategory.ong
      : normalizedCategory === 'Community'
        ? formativeHistorical.byCategory.community
        : formativeHistorical.byCategory.fis;

    const sum = (list: any[], key: string) => list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
    const avg = (list: any[], key: string) => {
      if (!list.length) return 0;
      return list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0) / list.length;
    };

    const currentProjectsByStatus = currentProjects.reduce((acc: Record<string, number>, p: any) => {
      const status = (p.status || '').toString().trim() || 'Sin estado';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const historicalByYear = new Map<number, any>();
    for (const project of historicalProjects) {
      const projectYear = Number(project.year) || currentYear;
      const bucket = historicalByYear.get(projectYear) || {
        year: projectYear,
        projects: 0,
        organizations: new Set<string>(),
        fgk: 0,
        allies: 0,
        counterpart: 0,
        beneficiaries: 0,
        technical: [] as number[],
        financial: [] as number[],
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
      .map((item) => ({
        Año: item.year,
        Proyectos: item.projects,
        Organizaciones: item.organizations.size,
        'Inversión FGK': item.fgk,
        Contrapartida: item.counterpart,
        'Fondos Aliados': item.allies,
        Beneficiarios: item.beneficiaries,
        'Prom. Técnico': this.clampPercent(avg(item.technical, 'value') || (item.technical.reduce((a: number, b: number) => a + b, 0) / Math.max(1, item.technical.length))),
        'Prom. Financiero': this.clampPercent(avg(item.financial, 'value') || (item.financial.reduce((a: number, b: number) => a + b, 0) / Math.max(1, item.financial.length))),
      }));

    const maxHistoricalInvestment = Math.max(1, ...historicalRows.map((r) => Number(r['Inversi?n FGK']) || 0));
    const maxCurrentInvestment = Math.max(1, Number(currentStats?.investment || 0), Number(historicalStats?.investment || 0));
    const currentTechnicalAvg = currentProjects.length > 0 ? this.clampPercent(avg(currentProjects, 'technicalProgressPercentage')) : 0;
    const currentFinancialAvg = currentProjects.length > 0 ? this.clampPercent(avg(currentProjects, 'financialProgressPercentage')) : 0;
    const historicalTechnicalAvg = historicalProjects.length > 0 ? this.clampPercent(avg(historicalProjects, 'technicalProgressPercentage')) : 0;
    const historicalFinancialAvg = historicalProjects.length > 0 ? this.clampPercent(avg(historicalProjects, 'financialProgressPercentage')) : 0;

    const currentBeneficiaries = currentProjects.reduce((acc, p) => acc + (Number(p.beneficiaries) || 0), 0);
    const historicalBeneficiaries = historicalProjects.reduce((acc, p) => acc + (Number(p.beneficiaries) || 0), 0);
    const currentOrgCount = normalizedCategory === 'FIS' ? Number((currentStats as any).ventures || 0) : Number((currentStats as any).orgs || 0);
    const historicalOrgCount = normalizedCategory === 'FIS' ? Number((historicalStats as any).ventures || 0) : Number((historicalStats as any).orgs || 0);

    const wb = XLSX.utils.book_new();

    const monitorRows = [
      [categoryConfig.title],
      ['Datos consolidados desde el inicio de operaciones en esta categoría'],
      [],
      ['Visión Histórica'],
      ['Indicador', 'Valor'],
      [categoryConfig.orgLabel, historicalOrgCount],
      [categoryConfig.projectsLabel, historicalStats.projects || 0],
      [categoryConfig.investmentLabel, this.formatCurrency(historicalStats.investment || 0)],
      [categoryConfig.alliesLabel, this.formatCurrency(sum(historicalProjects, 'amountAllies'))],
      [categoryConfig.beneficiariesLabel, historicalBeneficiaries],
      [],
      ['Formación Histórica'],
      ['Indicador', 'Valor'],
      [categoryConfig.historyOrgLabel, formativeHistoricalCategory.graduated || 0],
      [categoryConfig.participantLabel, formativeHistoricalCategory.enrolled || 0],
      [],
      [categoryConfig.monitorLabel + ' ' + currentYear],
      ['Indicador', 'Valor'],
      [categoryConfig.orgLabel, currentOrgCount],
      [categoryConfig.projectsLabel, currentStats.projects || 0],
      [categoryConfig.investmentLabel, this.formatCurrency(currentStats.investment || 0)],
      [categoryConfig.alliesLabel, this.formatCurrency(sum(currentProjects, 'amountAllies'))],
      ['Beneficiarios Directos', currentBeneficiaries],
      ['Beneficiarios Indirectos', 0],
      [],
      ['AVANCE'],
      ['Indicador', 'Valor'],
      ['Promedio Global', ((currentTechnicalAvg + currentFinancialAvg) / 2).toFixed(2) + '%'],
      ['Avance Técnico Global', currentTechnicalAvg.toFixed(2) + '%'],
      ['Ejecución Financiera Global', currentFinancialAvg.toFixed(2) + '%'],
    ];
    const monitorSheet = XLSX.utils.aoa_to_sheet(monitorRows);
    XLSX.utils.book_append_sheet(wb, monitorSheet, 'Monitor');

    const graphsRows: any[][] = [
      ['Métrica', 'Valor', 'Visual'],
      [categoryConfig.orgLabel, currentOrgCount, this.buildBar(currentOrgCount, Math.max(1, currentOrgCount))],
      [categoryConfig.projectsLabel, currentStats.projects || 0, this.buildBar(Number(currentStats.projects || 0), Math.max(1, currentStats.projects || 0))],
      [categoryConfig.investmentLabel, this.formatCurrency(currentStats.investment || 0), this.buildBar(Number(currentStats.investment || 0), maxCurrentInvestment)],
      [categoryConfig.alliesLabel, this.formatCurrency(sum(currentProjects, 'amountAllies')), this.buildBar(sum(currentProjects, 'amountAllies'), maxCurrentInvestment)],
      [categoryConfig.beneficiariesLabel, currentBeneficiaries, this.buildBar(currentBeneficiaries, Math.max(1, currentBeneficiaries))],
      [categoryConfig.historyOrgLabel, formativeHistoricalCategory.graduated || 0, this.buildBar(Number(formativeHistoricalCategory.graduated || 0), Math.max(1, Number(formativeHistoricalCategory.graduated || 0)))],
      [categoryConfig.participantLabel, formativeHistoricalCategory.enrolled || 0, this.buildBar(Number(formativeHistoricalCategory.enrolled || 0), Math.max(1, Number(formativeHistoricalCategory.enrolled || 0)))],
      ['Avance Técnico Global', currentTechnicalAvg.toFixed(2) + '%', this.buildBar(currentTechnicalAvg, 100)],
      ['Ejecución Financiera Global', currentFinancialAvg.toFixed(2) + '%', this.buildBar(currentFinancialAvg, 100)],
      [],
      ['Composición de Fondos'],
      ['Concepto', 'Monto', 'Porcentaje'],
      ['FGK', currentStats.investment || 0, ((Number(currentStats.investment || 0) / Math.max(1, Number(currentStats.investment || 0) + sum(currentProjects, 'counterpart') + sum(currentProjects, 'amountAllies'))) * 100).toFixed(2) + '%'],
      ['Contrapartida', sum(currentProjects, 'counterpart'), ((sum(currentProjects, 'counterpart') / Math.max(1, Number(currentStats.investment || 0) + sum(currentProjects, 'counterpart') + sum(currentProjects, 'amountAllies'))) * 100).toFixed(2) + '%'],
      ['Aliados', sum(currentProjects, 'amountAllies'), ((sum(currentProjects, 'amountAllies') / Math.max(1, Number(currentStats.investment || 0) + sum(currentProjects, 'counterpart') + sum(currentProjects, 'amountAllies'))) * 100).toFixed(2) + '%'],
      [],
      ['Estado de proyectos'],
      ['Estado', 'Cantidad', 'Visual'],
    ];
    Object.entries(currentProjectsByStatus as Record<string, number>)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const numericCount = Number(count) || 0;
        graphsRows.push([status, numericCount, this.buildBar(numericCount, Math.max(1, numericCount))]);
      });

    if (historicalRows.length > 0) {
      graphsRows.push([], ['Histórico por edición'], ['Año', 'Proyectos', 'Inversión FGK', 'Visual']);
      historicalRows.forEach((row) => {
        graphsRows.push([
          row.Año,
          row.Proyectos,
          row['Inversión FGK'],
          this.buildBar(Number(row['Inversión FGK']) || 0, maxHistoricalInvestment),
        ]);
      });
    }
    const graphsSheet = XLSX.utils.aoa_to_sheet(graphsRows);
    XLSX.utils.book_append_sheet(wb, graphsSheet, 'Gráficos');

    const historicalSheet = XLSX.utils.json_to_sheet(historicalRows.length > 0 ? historicalRows : [{
      Año: currentYear,
      Proyectos: 0,
      Organizaciones: 0,
      'Inversión FGK': 0,
      Contrapartida: 0,
      'Fondos Aliados': 0,
      Beneficiarios: 0,
      'Prom. Técnico': 0,
      'Prom. Financiero': 0,
    }]);
    XLSX.utils.book_append_sheet(wb, historicalSheet, 'Histórico');

    const detailSheet = XLSX.utils.json_to_sheet(currentProjects.map(p => ({
      'ID Proyecto': p.id,
      'Nombre del Proyecto': p.name,
      Organización: p.organization,
      Categoría: p.category,
      Departamento: p.department,
      Municipio: (p as any).municipality || '',
      'Inversión FGK': p.amountFGK,
      Contrapartida: p.counterpart,
      'Fondos Aliados': p.amountAllies,
      'Beneficiarios Directos': p.beneficiaries,
      'Beneficiarios Indirectos': (p as any).indirectBeneficiaries || 0,
      Estado: p.status || '',
      Año: p.year,
      'Avance Técnico': this.clampPercent(Number(p.technicalProgressPercentage) || 0).toFixed(2) + '%',
      'Ejecución Financiera': this.clampPercent(Number(p.financialProgressPercentage) || 0).toFixed(2) + '%',
    })));
    XLSX.utils.book_append_sheet(wb, detailSheet, 'Proyectos');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async generateProjectPdf(projectId: string): Promise<Buffer> {
    const project = await this.getProjectById(projectId);
    if (!project) {
      throw new Error('Proyecto no encontrado');
    }
    
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const normalFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    page.drawText(`FICHA DE PROYECTO - ${project.name}`, { x: 50, y: 750, size: 16, font });
    page.drawText(`Organización: ${project.organization}`, { x: 50, y: 710, size: 12, font: normalFont });
    page.drawText(`Categoría: ${project.category}`, { x: 50, y: 690, size: 12, font: normalFont });
    page.drawText(`Departamento: ${project.department}`, { x: 50, y: 670, size: 12, font: normalFont });
    page.drawText(`Edición: ${project.year}`, { x: 50, y: 650, size: 12, font: normalFont });
    page.drawText(`Estado: ${project.status}`, { x: 50, y: 630, size: 12, font: normalFont });
    page.drawText(`Inversión FGK: $${project.amountFGK.toLocaleString()}`, { x: 50, y: 610, size: 12, font: normalFont });
    page.drawText(`Contrapartida: $${project.counterpart.toLocaleString()}`, { x: 50, y: 590, size: 12, font: normalFont });
    page.drawText(`Beneficiarios Directos: ${project.beneficiaries.toLocaleString()}`, { x: 50, y: 570, size: 12, font: normalFont });
    page.drawText(`Progreso Técnico: ${project.technicalProgressPercentage}%`, { x: 50, y: 550, size: 12, font: normalFont });
    page.drawText(`Progreso Financiero: ${project.financialProgressPercentage}%`, { x: 50, y: 530, size: 12, font: normalFont });
    
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async generateFormativeExcel(): Promise<Buffer> {
    {
      const currentYear = await this.getCurrentReportYear();
      const [formativeData, formativeCurrent, participants, cortes, fisParticipants] = await Promise.all([
        this.dashboardService.getFormativeData(),
        this.dashboardService.getFormativeData(currentYear),
        this.getFormativeParticipants(),
        this.dashboardService.getCommunityCortes().catch(() => []),
        this.dashboardService.getFisParticipants().catch(() => []),
      ]);
      return this.runNativeExcelScript('formative-report.native.mjs', {
        generatedAt: new Date().toISOString(),
        currentYear,
        formativeData,
        formativeCurrent,
        participants,
        cortes,
        fisParticipants,
      }, 'formative-report');
    }

    const formativeData = await this.dashboardService.getFormativeData();
    const participants = await this.getFormativeParticipants();
    
    const wb = XLSX.utils.book_new();
    
    // Resumen
    const summarySheet = XLSX.utils.json_to_sheet([
      { Indicador: 'Total Inscritos', Valor: formativeData.totalEnrolled },
      { Indicador: 'Total Graduados', Valor: formativeData.totalGraduated },
      { Indicador: 'Tasa de Retención', Valor: `${formativeData.retentionRate.toFixed(1)}%` },
      { Indicador: 'Mujeres Graduadas', Valor: formativeData.byGender.F },
      { Indicador: 'Hombres Graduados', Valor: formativeData.byGender.M },
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumen Formación');
    
    // Por categoría
    const categorySheet = XLSX.utils.json_to_sheet([
      { Categoría: 'ONG', Inscritos: formativeData.byCategory.ong.enrolled, Graduados: formativeData.byCategory.ong.graduated },
      { Categoría: 'Desarrollo Comunitario', Inscritos: formativeData.byCategory.community.enrolled, Graduados: formativeData.byCategory.community.graduated },
      { Categoría: 'Emprendimiento', Inscritos: formativeData.byCategory.fis.enrolled, Graduados: formativeData.byCategory.fis.graduated },
    ]);
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Por Categoría');
    
    // Por departamento
    const deptSheet = XLSX.utils.json_to_sheet(
      Object.entries(formativeData.byDepartment).map(([dept, count]) => ({
        Departamento: dept,
        Graduados: count,
      }))
    );
    XLSX.utils.book_append_sheet(wb, deptSheet, 'Por Departamento');
    
    // Listado de participantes
    const participantsSheet = XLSX.utils.json_to_sheet(participants.map(p => ({
      Nombre: p.nombre,
      Edad: p.edad,
      Género: p.genero === 'F' ? 'Mujer' : 'Hombre',
      Departamento: p.departamento,
      Estado: p.estado_formacion,
      Proyecto: p.proyecto_nombre,
      Organización: p.organizacion_nombre,
    })));
    XLSX.utils.book_append_sheet(wb, participantsSheet, 'Participantes');
    
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // Métodos auxiliares (reutilizados de dashboard.service.ts)

  private async getProjects(filters?: { category?: string; year?: number }) {
    let query = `
      SELECT 
        p.id, p.nombre_proyecto as name, o.nombre as organization, o.categoria as category,
        p.departamento as department, p.monto_fgk as amountFGK, p.contrapartida_org as counterpart,
        p.monto_aliados as amountAllies, p.beneficiarios_directos as beneficiaries,
        p.estado as status, e.año as year, p.progreso_tecnico as technicalProgressPercentage,
        p.progreso_financiero as financialProgressPercentage
      FROM proyectos p
      JOIN organizaciones o ON p.organizacion_id = o.id
      JOIN ediciones e ON p.edicion_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters?.year) {
      query += ` AND e.año = ?`;
      params.push(filters.year);
    }
    if (filters?.category) {
      const normalizedFilterCategory = this.normalizeCategory(filters.category);
      if (normalizedFilterCategory === 'Community') {
        query += ` AND (o.categoria = ? OR LOWER(o.categoria) LIKE ?)`;
        params.push('Community', '%comunitario%');
      } else {
        query += ` AND o.categoria = ?`;
        params.push(normalizedFilterCategory);
      }
    }
    const results = await this.entityManager.query(query, params);
    return results.map(row => ({
      id: row.id,
      name: row.name,
      organization: row.organization,
      category: row.category,
      department: row.department,
      amountFGK: parseFloat(row.amountFGK) || 0,
      counterpart: parseFloat(row.counterpart) || 0,
      amountAllies: parseFloat(row.amountAllies) || 0,
      beneficiaries: parseInt(row.beneficiaries) || 0,
      status: row.status,
      year: row.year,
      technicalProgressPercentage: row.technicalProgressPercentage || 0,
      financialProgressPercentage: row.financialProgressPercentage || 0,
    }));
  }

  private async getProjectById(id: string) {
    const query = `
      SELECT 
        p.id, p.nombre_proyecto as name, o.nombre as organization, o.categoria as category,
        p.departamento as department, p.monto_fgk as amountFGK, p.contrapartida_org as counterpart,
        p.beneficiarios_directos as beneficiaries, p.estado as status, e.año as year,
        p.progreso_tecnico as technicalProgressPercentage,
        p.progreso_financiero as financialProgressPercentage
      FROM proyectos p
      JOIN organizaciones o ON p.organizacion_id = o.id
      JOIN ediciones e ON p.edicion_id = e.id
      WHERE p.id = ?
    `;
    const results = await this.entityManager.query(query, [id]);
    if (results.length === 0) return null;
    const row = results[0];
    return {
      id: row.id,
      name: row.name,
      organization: row.organization,
      category: row.category,
      department: row.department,
      amountFGK: parseFloat(row.amountFGK) || 0,
      counterpart: parseFloat(row.counterpart) || 0,
      beneficiaries: parseInt(row.beneficiaries) || 0,
      status: row.status,
      year: row.year,
      technicalProgressPercentage: row.technicalProgressPercentage || 0,
      financialProgressPercentage: row.financialProgressPercentage || 0,
    };
  }

  private async getFormativeParticipants(filters?: { category?: 'ONG' | 'Community' | 'FIS'; year?: number }) {
    let sql = `
      SELECT 
        pf.id, pf.nombre, pf.edad, pf.genero, pf.departamento, pf.estado_formacion,
        p.nombre_proyecto as proyecto_nombre, o.nombre as organizacion_nombre, o.categoria as category,
        e.año as year
      FROM participantes_formacion pf
      JOIN proyectos p ON pf.proyecto_id = p.id OR pf.proyecto_id = SUBSTRING_INDEX(p.id, '-', 1)
      JOIN organizaciones o ON p.organizacion_id = o.id
      JOIN ediciones e ON p.edicion_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (filters?.year) {
      sql += ` AND e.año = ?`;
      params.push(filters.year);
    }
    if (filters?.category) {
      if (filters.category === 'Community') {
        sql += ` AND (o.categoria = ? OR LOWER(o.categoria) LIKE ?)`;
        params.push('Community', '%comunitario%');
      } else {
        sql += ` AND o.categoria = ?`;
        params.push(filters.category);
      }
    }
    return this.entityManager.query(sql, params);
  }
}
