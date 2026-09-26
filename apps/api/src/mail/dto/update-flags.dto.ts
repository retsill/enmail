import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateFlagsDto {
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isFlagged?: boolean;
}

export class BulkUpdateFlagsDto extends UpdateFlagsDto {
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];
}
