import { IsArray, IsString } from 'class-validator';

export class MoveMessageDto {
  @IsString()
  targetFolderId!: string;
}

export class BulkMoveMessagesDto {
  @IsArray()
  @IsString({ each: true })
  messageIds!: string[];

  @IsString()
  targetFolderId!: string;
}
