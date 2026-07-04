import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
  } from 'class-validator';
  
  import { Type } from 'class-transformer';
  
  export class SearchDto {
    @IsString()
    @IsNotEmpty()
    q: string;
  
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page = 1;
  
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    limit = 10;
  }