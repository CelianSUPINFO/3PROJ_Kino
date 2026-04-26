import { ReportStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class ResolveReportDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;
}

export class BanUserDto {
  @IsOptional()
  @IsISO8601()
  until?: string | null;
}
