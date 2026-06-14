import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RequestEmailActionDto {
  @IsEmail()
  email!: string;
}

export class VerifyTokenDto {
  @IsString()
  @MinLength(32)
  token!: string;
}

export class ResetPasswordDto extends VerifyTokenDto {
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/)
  @Matches(/[a-z]/)
  @Matches(/[0-9]/)
  password!: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/)
  @Matches(/[a-z]/)
  @Matches(/[0-9]/)
  newPassword!: string;
}
