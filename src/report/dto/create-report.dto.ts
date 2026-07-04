import {
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    ValidateIf,
  } from 'class-validator';
  
  import { ReportReason } from '@prisma/client';
  
  export class CreateReportDto {
    @IsOptional()
    @IsUUID()
    postId?: string;
  
    @IsOptional()
    @IsUUID()
    commentId?: string;
  
    @IsOptional()
    @IsUUID()
    reportedUserId?: string;
  
    @IsEnum(ReportReason)
    reason: ReportReason;
  
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
  }