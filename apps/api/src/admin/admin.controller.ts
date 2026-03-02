import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reports')
  reports() {
    return this.admin.reports();
  }

  @Patch('reports/:id')
  resolve(
    @Param('id') id: string,
    @Body() body: { status: ReportStatus },
  ) {
    return this.admin.resolveReport(id, body.status);
  }

  @Post('users/:id/ban')
  ban(@Param('id') id: string, @Body() body: { until: string | null }) {
    return this.admin.banUser(
      id,
      body.until ? new Date(body.until) : new Date('2099-01-01'),
    );
  }
}
