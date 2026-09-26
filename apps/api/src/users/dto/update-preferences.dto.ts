import { IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';
import type { ComposeStyle, MailDensity, ThemeBackgroundType } from '../../generated/prisma/enums.js';

const CATEGORY_VALUES = ['PRIMARY', 'SOCIAL', 'PROMOTIONS', 'UPDATES', 'FORUMS'];

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn([2, 3, 4])
  layoutColumns?: number;

  @IsOptional()
  @IsIn(['POPUP', 'FULLSCREEN'])
  composeStyle?: ComposeStyle;

  @IsOptional()
  @IsIn([25, 50, 100])
  pageSize?: number;

  @IsOptional()
  @IsIn(['DEFAULT', 'COMFORTABLE', 'COMPACT'])
  density?: MailDensity;

  @IsOptional()
  @IsIn(['NONE', 'COLOR', 'IMAGE'])
  themeBackgroundType?: ThemeBackgroundType;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  themeBackground?: string;

  @IsOptional()
  @IsArray()
  @IsIn(CATEGORY_VALUES, { each: true })
  enabledCategories?: string[];

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(100)
  backgroundOpacity?: number;
}
