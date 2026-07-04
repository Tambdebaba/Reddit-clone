import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
  } from 'class-validator';
  
  export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(300)
    title: string;
  
    @IsString()
    @IsOptional()
    @MaxLength(40000)
    content?: string;
  
    @IsString()
    @IsNotEmpty()
    subredditName: string;
  }