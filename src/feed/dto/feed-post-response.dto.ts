export class FeedPostResponseDto {
    id: string;
  
    title: string;
  
    content: string | null;
  
    score: number;
  
    commentCount: number;
  
    createdAt: Date;
  
    author: {
      username: string;
  
      displayName: string | null;
  
      avatarUrl: string | null;
    };
  
    subreddit: {
      id: string;
  
      name: string;
  
      title: string;
    };
  }