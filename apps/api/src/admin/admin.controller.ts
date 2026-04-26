import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { BanUserDto, ResolveReportDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reports')
  reports() {
    return this.admin.reports();
  }

  @Patch('reports/:id')
  resolve(@Param('id') id: string, @Body() body: ResolveReportDto) {
    return this.admin.resolveReport(id, body.status);
  }

  @Post('users/:id/ban')
  ban(@Param('id') id: string, @Body() body: BanUserDto) {
    return this.admin.banUser(
      id,
      body.until ? new Date(body.until) : new Date('2099-01-01'),
    );
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string) {
    return this.admin.deleteReview(id);
  }

  @Get('reviews')
  listReviews() {
    return this.admin.listReviews();
  }
}
