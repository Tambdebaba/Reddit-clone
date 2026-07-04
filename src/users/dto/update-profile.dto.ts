import {
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    IsEnum,
  } from 'class-validator';
  
  import { Gender } from '@prisma/client';
  
  export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;
  
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;
  
    @IsOptional()
    @IsUrl()
    avatarUrl?: string;
  
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;
  }