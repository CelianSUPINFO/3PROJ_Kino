import { ReportStatus, Role } from '@prisma/client';
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

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsISO8601()
  bannedUntil?: string | null;
}
