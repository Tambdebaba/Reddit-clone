import {
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
  } from 'class-validator';
  
  export class CreateCommentDto {
    @IsString()
    @MinLength(1)
    @MaxLength(10000)
    body: string;
  
    @IsOptional()
    @IsUUID()
    parentId?: string;
  }