import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DashboardModule, AuditModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
