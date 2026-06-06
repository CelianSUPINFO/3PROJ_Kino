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
import { BanUserDto, ResolveReportDto, UpdateAdminUserDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reports')
  reports() {
    return this.admin.reports();
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: UpdateAdminUserDto) {
    return this.admin.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Patch('reports/:id')
  resolve(@Param('id') id: string, @Body() body: ResolveReportDto) {
    return this.admin.resolveReport(id, body.status);
  }

  @Get('message-reports')
  messageReports() {
    return this.admin.messageReports();
  }

  @Patch('message-reports/:id')
  resolveMessageReport(@Param('id') id: string, @Body() body: ResolveReportDto) {
    return this.admin.resolveMessageReport(id, body.status);
  }

  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string) {
    return this.admin.deleteMessage(id);
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
