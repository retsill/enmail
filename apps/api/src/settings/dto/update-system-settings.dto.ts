import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const SUPPORTED_LOCALES = ['es', 'en'] as const;

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  siteName?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  defaultLocale?: string;
}
