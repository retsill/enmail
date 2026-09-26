import { IsOptional, IsString } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  color?: string | null;

  @IsOptional()
  @IsString()
  name?: string;
}
