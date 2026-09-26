-- AlterTable
ALTER TABLE `mail_server_settings` ADD COLUMN `allowInsecureTls` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `mail_accounts` ADD COLUMN `allowInsecureTls` BOOLEAN NOT NULL DEFAULT false;
