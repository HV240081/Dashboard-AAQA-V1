import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary/pdf')
  async generateSummaryPdf(@Res() res: Response) {
    const pdfBuffer = await this.reportsService.generateSummaryPdf();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=resumen_ejecutivo.pdf',
    });
    res.send(pdfBuffer);
  }

  @Get('summary/excel')
  async generateSummaryExcel(@Res() res: Response) {
    const buffer = await this.reportsService.generateSummaryExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=resumen_ejecutivo.xlsx',
    });
    res.send(buffer);
  }

  @Get('category/:category/excel')
  async generateCategoryExcel(
    @Param('category') category: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const buffer = await this.reportsService.generateCategoryExcel(category, year ? parseInt(year) : undefined);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=categoria_${category}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('project/:id/pdf')
  async generateProjectPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.generateProjectPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=proyecto_${id}.pdf`,
    });
    res.send(pdfBuffer);
  }

  @Get('formative/excel')
  async generateFormativeExcel(@Res() res: Response) {
    const buffer = await this.reportsService.generateFormativeExcel();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=reporte_formativo.xlsx',
    });
    res.send(buffer);
  }
}