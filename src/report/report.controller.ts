import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportService } from './report.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() dto: CreateReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportService.create(dto, user.sub);
  }

  @Get()
  findAll() {
    return this.reportService.findAll();
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.reportService.resolve(id);
  }

  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string) {
    return this.reportService.dismiss(id);
  }
}