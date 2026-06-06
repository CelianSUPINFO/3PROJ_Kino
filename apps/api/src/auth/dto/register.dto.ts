import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Le nom affiché doit contenir au moins 2 caractères' })
  displayName!: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre',
  })
  password!: string;
}
