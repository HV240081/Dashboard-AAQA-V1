import { Controller, Get, Query, Put, Body, UseGuards, Request, UnauthorizedException, Param, UseInterceptors, Post, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(AuditInterceptor)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ==============================================
  // ENDPOINTS DE LECTURA (GET)
  // ==============================================

  @Get('global')
  async getGlobalData(@Query('year') year?: string) {
    return this.dashboardService.getGlobalData(year ? parseInt(year) : undefined);
  }

  @Get('categories')
  async getCategoriesData(@Query('year') year?: string) {
    return this.dashboardService.getCategoriesData(year ? parseInt(year) : undefined);
  }

  @Get('formative')
  async getFormativeData(@Query('year') year?: string) {
    return this.dashboardService.getFormativeData(year ? parseInt(year) : undefined);
  }

  @Get('projects')
  async getProjects(
    @Query('year') year?: string,
    @Query('category') category?: string,
  ) {
    return this.dashboardService.getProjects({
      year: year ? parseInt(year) : undefined,
      category,
    });
  }

  @Get('editions')
  async getEditions() {
    return this.dashboardService.getEditions();
  }

  @Post('editions')
  async createEdition(@Request() req, @Body() body: { year: number }) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('Solo Admin o Gerencia pueden agregar nuevas ediciones.');
    }
    return this.dashboardService.createEdition(body.year);
  }

  @Delete('editions/:year')
  async deleteEdition(@Request() req, @Param('year') year: string) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('Solo Admin o Gerencia pueden eliminar ediciones.');
    }
    return this.dashboardService.deleteEdition(parseInt(year));
  }

  @Get('community/cortes')
  async getCommunityCortes() {
    return this.dashboardService.getCommunityCortes();
  }

  @Post('community/cortes')
  async updateCommunityCortes(@Request() req, @Body() body: { cortes: any[] }) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3 && rol !== 4) {
      throw new UnauthorizedException('No tiene permisos para editar cortes comunitarios.');
    }
    return this.dashboardService.updateCommunityCortes(body.cortes);
  }

  @Delete('community/cortes/:id')
  async deleteCommunityCorte(@Request() req, @Param('id') id: string) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3 && rol !== 4) {
      throw new UnauthorizedException('No tiene permisos para eliminar cortes comunitarios.');
    }
    return this.dashboardService.deleteCommunityCorte(id);
  }

  @Get('fis/participants')
  async getFisParticipants(@Query('year') year?: string) {
    return this.dashboardService.getFisParticipants(year ? parseInt(year) : undefined);
  }

  @Post('fis/participants')
  async replaceFisParticipants(@Request() req, @Body() body: { participants: any[] }) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('No tiene permisos para modificar participantes de Emprendimiento Social.');
    }
    return this.dashboardService.replaceFisParticipants(body.participants || [], req.user?.userId);
  }

  @Delete('fis/participants/:id')
  async deleteFisParticipant(@Request() req, @Param('id') id: string) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('No tiene permisos para modificar participantes de Emprendimiento Social.');
    }
    return this.dashboardService.deleteFisParticipant(id, req.user?.userId);
  }

  @Post('fis/participants/delete')
  async deleteFisParticipantLegacy(@Request() req, @Body() body: { id: string }) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('No tiene permisos para modificar participantes de Emprendimiento Social.');
    }
    return this.dashboardService.deleteFisParticipant(body.id, req.user?.userId);
  }

  @Get('text-content')
  async getTextContent() {
    return this.dashboardService.getTextContent();
  }

  // Nuevos endpoints de geografía
  @Get('geografia/departamentos')
  async getDepartamentos() {
    return this.dashboardService.getDepartamentos();
  }

  @Get('geografia/municipios')
  async getMunicipios(@Query('departamento') departamento: string) {
    return this.dashboardService.getMunicipios(departamento);
  }

  @Get('geografia/distritos')
  async getDistritos(
    @Query('departamento') departamento: string,
    @Query('municipio') municipio: string
  ) {
    return this.dashboardService.getDistritos(departamento, municipio);
  }

  // Obtener textos editables por categoría
  @Get('textos')
  async getTextos(@Query('categoria') categoria?: string) {
    return this.dashboardService.getTextos(categoria);
  }

  // Obtener años disponibles para filtro (2006-actual)
  @Get('available-years')
  async getAvailableYears() {
    return this.dashboardService.getAvailableYears();
  }

  // Obtener datos para mapa interactivo
  @Get('geodata')
  async getGeoData(@Query('year') year?: string) {
    return this.dashboardService.getGeoData(year ? parseInt(year) : undefined);
  }

  // Obtener estadísticas por departamento
  @Get('stats/departamentos')
  async getStatsByDepartamento(@Query('year') year?: string) {
    return this.dashboardService.getStatsByDepartamento(year ? parseInt(year) : undefined);
  }

  // Comparación entre años
  @Get('compare')
  async compareYears(@Query('years') years: string) {
    const yearsArray = years.split(',').map(y => parseInt(y));
    return this.dashboardService.compareYears(yearsArray);
  }

  // Obtener contrapartida comunal detallada
  @Get('community/counterpart/:projectId')
  async getCommunityCounterpart(@Param('projectId') projectId: string) {
    return this.dashboardService.getCommunityCounterpart(projectId);
  }

  // ==============================================
  // ENDPOINTS DE ESCRITURA (PUT) - PARA EDICIÓN MANUAL
  // ==============================================

  @Put('financials')
  async updateFinancials(@Request() req, @Body() body: { fgk: number; aliados: number; contrapartida: number }) {
    const rol = req.user.rolId;
    // Admin(1), Gerente(3) e Irvin(5) para el área de fondos
    if (rol !== 1 && rol !== 3 && rol !== 5) {
      throw new UnauthorizedException('No tienes permisos para editar datos financieros');
    }
    return this.dashboardService.updateFinancials(body);
  }

  @Put('categories')
  async updateCategories(@Request() req, @Body() body: any) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) throw new UnauthorizedException('No autorizado para modificar metas operativas');
    return this.dashboardService.updateCategories(body);
  }

  @Put('formative')
  async updateFormative(@Request() req, @Body() body: any) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) throw new UnauthorizedException('No autorizado para modificar impactos formativos');
    return this.dashboardService.updateFormative(body);
  }

  @Put('current-edition')
  async updateCurrentEdition(@Request() req, @Body() body: any) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('Solo Admin o Gerencia pueden alterar metas del año vigente');
    }
    return this.dashboardService.updateCurrentEdition(body);
  }

  @Put('text-content')
  async updateTextContent(@Request() req, @Body() body: { category: string; key: string; value: string }) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) throw new UnauthorizedException('Solo Geo y Violeta pueden editar textos');
    
    return this.dashboardService.updateTextContent(body.category, body.key, body.value);
  }

  // Actualizar texto editable (nueva versión unificada)
  @Put('textos')
  async updateTexto(
    @Request() req,
    @Body() body: { categoria: string; clave: string; valor: string }
  ) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) throw new UnauthorizedException('Solo Geo y Violeta pueden editar textos');
    return this.dashboardService.updateTexto(body.categoria, body.clave, body.valor, req.user.userId);
  }

  // Actualizar contrapartida comunal
  @Put('community/counterpart/:projectId')
  async updateCommunityCounterpart(
    @Param('projectId') projectId: string,
    @Body() body: { laborAmount: number; materialsAmount: number },
    @Request() req
  ) {
    const rol = req.user.rolId;
    if (rol !== 1 && rol !== 3) {
      throw new UnauthorizedException('No tiene permisos para editar contrapartida comunal');
    }
    return this.dashboardService.updateCommunityCounterpart(projectId, body, req.user.userId);
  }
}
