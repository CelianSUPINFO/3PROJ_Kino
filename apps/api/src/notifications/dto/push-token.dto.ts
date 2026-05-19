import { IsIn, IsString, MinLength } from 'class-validator';

export class PushTokenDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsString()
  @IsIn(['ios', 'android'])
  platform!: string;
}
