export class UserProfileResponseDto {
    id: string;
  
    username: string;
  
    displayName: string | null;
  
    bio: string | null;
  
    avatarUrl: string | null;
  
    gender: string | null;
  
    createdAt: Date;
  
    karma: number;
  
    postCount: number;
  
    commentCount: number;
  }