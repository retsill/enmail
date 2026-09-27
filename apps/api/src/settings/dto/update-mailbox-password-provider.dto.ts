import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateMailboxPasswordProviderDto {
  @IsIn(['NONE', 'CPANEL', 'PLESK', 'AAPANEL'])
  provider!: 'NONE' | 'CPANEL' | 'PLESK' | 'AAPANEL';

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  username?: string;

  // Vacío/omitido = no tocar la clave/token ya guardado.
  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsBoolean()
  allowInsecureTls?: boolean;
}
