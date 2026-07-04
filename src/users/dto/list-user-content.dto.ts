import {
    IsInt,
    IsOptional,
    Min,
  } from 'class-validator';
  
  import { Type } from 'class-transformer';
  
  export class ListUserContentDto {
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