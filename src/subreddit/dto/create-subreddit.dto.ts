import {
    IsBoolean,
    IsOptional,
    IsString,
    Length,
  } from 'class-validator';
  
  export class CreateSubredditDto {
    @IsString()
    @Length(3, 21)
    name: string;
  
    @IsString()
    @Length(3, 100)
    title: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsString()
    rules?: string;
  
    @IsOptional()
    @IsBoolean()
    isNsfw?: boolean;
  }