import { MediaType, WatchStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';

export class SetStatusDto {
  @IsInt()
  tmdbId!: number;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsEnum(WatchStatus)
  status!: WatchStatus;
}

export class CreateListDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsBoolean()
  isPublic!: boolean;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class ListItemDto {
  @IsInt()
  tmdbId!: number;

  @IsEnum(MediaType)
  mediaType!: MediaType;
}
