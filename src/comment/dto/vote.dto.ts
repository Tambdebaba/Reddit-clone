import { IsEnum } from 'class-validator';
import { VoteType } from '@prisma/client';

export class VoteDto {
  @IsEnum(VoteType)
  voteType: VoteType;
}