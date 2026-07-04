import {
    IsIn,
    IsInt,
    IsOptional,
    Min,
  } from 'class-validator';
  
  import { Type } from 'class-transformer';
  
  export class ListFeedDto {
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
  
    @IsOptional()
    @IsIn([
      'new',
      'top',
      'hot',
    ])
    sort: 'new' | 'top' | 'hot' = 'hot';
  
    @IsOptional()
    @IsIn([
      'hour',
      'day',
      'week',
      'month',
      'year',
      'all',
    ])
    time:
      | 'hour'
      | 'day'
      | 'week'
      | 'month'
      | 'year'
      | 'all' = 'all';
  }