import { IsString, Length } from 'class-validator';

export class SendMessageDto {
  @IsString()
  recipientId!: string;

  @IsString()
  @Length(1, 1000)
  body!: string;
}
