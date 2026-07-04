import {
    IsOptional,
    IsString,
    MaxLength,
  } from 'class-validator';
  
  export class UpdatePostDto {
    @IsOptional()
    @IsString()
    @MaxLength(300)
    title?: string;
  
    @IsOptional()
    @IsString()
    content?: string;
  }