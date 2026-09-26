import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateAddonConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}
