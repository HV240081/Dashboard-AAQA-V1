import { Controller, Put, Post, Get, Delete, Param, Body, UseGuards, Request, UseInterceptors, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectsService } from './projects.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('projects')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(AuditInterceptor)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {
    console.log('🚀 ProjectsController cargado y listo');
  }

  private ensureFullAccess(req: any) {
    const rol = req?.user?.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('No tiene permisos para modificar proyectos.');
    }
  }

  @Post(':id/reports')
  async addReport(@Param('id') id: string, @Body() reportData: any, @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.addReport(id, reportData, req.user?.userId);
  }

  @Get(':id')
  async getProjectById(@Param('id') id: string, @Request() req) {
    return this.projectsService.getProjectById(id);
  }

  @Put(':id/reports/:reportId')
  async updateReport(@Param('id') id: string, @Param('reportId') reportId: string, @Body() reportData: any, @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.updateReport(id, reportId, reportData, req.user?.userId);
  }

  @Delete(':id/reports/:reportId')
  async deleteReport(@Param('id') id: string, @Param('reportId') reportId: string, @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.deleteReport(id, reportId, req.user?.userId);
  }

  @Put(':id/matrix')
  async updateMatrix(@Param('id') id: string, @Body('progress') progress: string[], @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.updateProgressMatrix(id, progress, req.user?.userId);
  }

  @Put(':id')
  async updateProject(@Param('id') id: string, @Body() projectData: any, @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.updateProject(id, projectData, req.user?.userId);
  }

  @Post()
  async createProject(@Body() projectData: any, @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.createProject(projectData, req.user?.userId);
  }

  @Delete(':id')
  async deleteProject(@Param('id') id: string, @Request() req) {
    this.ensureFullAccess(req);
    return this.projectsService.deleteProject(id, req.user?.userId);
  }
}
