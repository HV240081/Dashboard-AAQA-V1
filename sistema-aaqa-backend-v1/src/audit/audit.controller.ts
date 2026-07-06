import { Controller, Delete, Get, Param, Query, Request, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(AuthGuard('jwt'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  private ensureAuditAdmin(user: any) {
    const role = user?.rolId ?? user?.rol_id;
    if (role !== 1 && role !== 3 && user?.canEditAll !== true) {
      throw new UnauthorizedException('Solo Geo y Violeta pueden administrar la bitacora.');
    }
  }

  @Get('logs')
  async getLogs(
    @Query('tabla') tabla?: string,
    @Query('registroId') registroId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getLogs({
      tabla,
      registroId,
      usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('stats')
  async getStats() {
    return this.auditService.getStats();
  }

  @Get('export/excel')
  async exportExcel(
    @Res() res: Response,
    @Query('tabla') tabla?: string,
    @Query('registroId') registroId?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    const buffer = await this.auditService.exportExcel({
      tabla,
      registroId,
      usuarioId: usuarioId ? parseInt(usuarioId) : undefined,
    });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=auditoria_${new Date().toISOString().split('T')[0]}.xlsx`,
    });
    
    res.send(buffer);
  }

  @Delete('logs/:id')
  async deleteLog(@Request() req, @Param('id') id: string) {
    this.ensureAuditAdmin(req.user);
    return this.auditService.deleteLog(id);
  }

  @Delete('logs')
  async deleteAllLogs(@Request() req) {
    this.ensureAuditAdmin(req.user);
    return this.auditService.deleteAllLogs();
  }
}
