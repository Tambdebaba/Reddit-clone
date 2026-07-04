import { Test, TestingModule } from '@nestjs/testing';
import { SubredditService } from './subreddit.service';

describe('SubredditService', () => {
  let service: SubredditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubredditService],
    }).compile();

    service = module.get<SubredditService>(SubredditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
