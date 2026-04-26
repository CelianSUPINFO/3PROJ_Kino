import { MediaType } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  tmdbId!: number;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @Length(0, 4000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  spoiler?: boolean;
}

export class CreateCommentDto {
  @IsString()
  @Length(1, 1200)
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class ReportReviewDto {
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class FeaturedReviewDto {
  @IsBoolean()
  featured!: boolean;
}
