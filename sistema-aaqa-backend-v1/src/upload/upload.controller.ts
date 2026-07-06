import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Req, BadRequestException, Inject, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UploadService } from './upload.service';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
}

const sanitizeSegment = (value: any) =>
  (value ?? '')
    .toString()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'general';

const categoryPermissionKey = (category: string) => {
  const lower = (category || '').toString().toLowerCase();
  if (lower === 'community' || lower === 'dc' || lower.includes('desarrollo')) return 'DC';
  if (lower === 'fis' || lower === 'es' || lower.includes('emprendimiento')) return 'ES';
  if (lower.includes('corte') || lower.includes('adesco') || lower.includes('formacion')) return 'formacion_dc';
  if (lower === 'ong') return 'ONG';
  return category;
};

const userCanEditArea = (user: any, category: string) => {
  if (user?.rolId === 1 || user?.rolId === 3 || user?.canEditAll === true) return true;
  const key = categoryPermissionKey(category);
  return Array.isArray(user?.editableCategories) && user.editableCategories.includes(key);
};

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
@UseInterceptors(AuditInterceptor)
export class UploadController {
  constructor(@Inject(UploadService) private readonly uploadService: any) {}

  @Post('excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(@UploadedFile() file: MulterFile, @Req() req: any) {
    const category = (req.body?.category || '').toString().toLowerCase();
    const allowedForFundsManager = category === 'community' || category === 'dc';
    if (!userCanEditArea(req.user, category) && !(req.user?.rolId === 5 && allowedForFundsManager)) {
      throw new UnauthorizedException('Solo Geo y Violeta pueden cargar proyectos masivos, excepto Irvin en Desarrollo Comunitario.');
    }
    return this.uploadService.processExcel(file, req.user, req.body || {});
  }

  @Post('fis/participants-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFisParticipantsExcel(@UploadedFile() file: MulterFile, @Req() req: any) {
    if (!userCanEditArea(req.user, 'FIS')) {
      throw new UnauthorizedException('Solo Geo y Violeta pueden cargar participantes de Emprendimiento Social.');
    }
    return this.uploadService.processFisParticipantsExcel(file, req.user);
  }

  @Post('community/cortes-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCommunityCortesExcel(@UploadedFile() file: MulterFile, @Req() req: any) {
    if (!userCanEditArea(req.user, 'Cortes') && req.user?.rolId !== 4) {
      throw new UnauthorizedException('Solo Geo, Violeta y Jose Manuel pueden cargar Cortes Formativos.');
    }
    return this.uploadService.processCommunityCortesExcel(file, req.user);
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        try {
          const category = sanitizeSegment(req.body?.category || 'general');
          const year = sanitizeSegment(req.body?.year || 'sin-edicion');
          const projectName = sanitizeSegment(req.body?.projectName || req.body?.project || 'sin-proyecto');
          const resourceType = sanitizeSegment(req.body?.resourceType || req.body?.type || 'misc');
          const targetDir = path.join(process.cwd(), 'uploads', category, year, projectName);
          fs.mkdirSync(targetDir, { recursive: true });
          cb(null, targetDir);
        } catch (error) {
          cb(error as Error, path.join(process.cwd(), 'uploads'));
        }
      },
      filename: (req, file, cb) => {
        const resourceType = sanitizeSegment(req.body?.resourceType || req.body?.type || 'misc');
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.round(Math.random() * 16).toString(16))
          .join('');
        return cb(null, `${resourceType}-${randomName}${extname(file.originalname)}`);
      },
    }),
    limits: {
      fileSize: 25 * 1024 * 1024,
    },
  }))
  async uploadMedia(@UploadedFile() file: MulterFile, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo');
    }
    if (req.user?.rolId !== 1 && req.user?.rolId !== 3) {
      throw new UnauthorizedException('Solo Geo y Violeta pueden subir recursos.');
    }

    const category = sanitizeSegment(req.body?.category || 'general');
    const year = sanitizeSegment(req.body?.year || 'sin-edicion');
    const projectName = sanitizeSegment(req.body?.projectName || req.body?.project || 'sin-proyecto');
    const resourceType = sanitizeSegment(req.body?.resourceType || req.body?.type || 'misc');

    return {
      success: true,
      url: `http://localhost:3000/uploads/${category}/${year}/${projectName}/${file.filename}`,
    };
  }

  @Post('media/delete')
  async deleteMedia(@Req() req: any) {
    if (req.user?.rolId !== 1 && req.user?.rolId !== 3) {
      throw new UnauthorizedException('Solo Geo y Violeta pueden eliminar recursos.');
    }
    const url = (req.body?.url || '').toString().trim();
    if (!url) {
      throw new BadRequestException('Debe indicar la URL del archivo a eliminar');
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    const urlMarker = '/uploads/';
    const markerIndex = url.indexOf(urlMarker);
    if (markerIndex < 0) {
      return { success: true, message: 'Archivo fuera del directorio administrado' };
    }

    const relativePath = url.slice(markerIndex + urlMarker.length);
    const filePath = path.resolve(uploadsRoot, relativePath);
    if (filePath.startsWith(uploadsRoot) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
    }

    return { success: true, message: 'Archivo eliminado correctamente' };
  }
}
