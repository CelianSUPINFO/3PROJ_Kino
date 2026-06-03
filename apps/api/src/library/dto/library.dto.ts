import { MediaType, WatchStatus } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Length } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;
}

export class ListItemDto {
  @IsInt()
  tmdbId!: number;

  @IsEnum(MediaType)
  mediaType!: MediaType;
}

export class ReorderListDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}
