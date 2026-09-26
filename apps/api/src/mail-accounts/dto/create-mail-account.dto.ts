import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateMailAccountDto {
  @IsString()
  label!: string;

  @IsString()
  emailAddress!: string;

  @IsString()
  imapHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  imapPort!: number;

  @IsOptional()
  @IsBoolean()
  imapTls?: boolean;

  @IsString()
  smtpHost!: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort!: number;

  @IsOptional()
  @IsBoolean()
  smtpTls?: boolean;

  @IsString()
  username!: string;

  @IsString()
  password!: string;
}
