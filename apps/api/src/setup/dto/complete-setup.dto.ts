import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CompleteSetupDto {
  @IsString()
  @MinLength(1)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  siteName?: string;

  @IsString()
  imapHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort!: number;

  @IsBoolean()
  imapTls!: boolean;

  @IsString()
  smtpHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @IsBoolean()
  smtpTls!: boolean;
}
