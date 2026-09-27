-- AlterTable
ALTER TABLE `mail_server_settings`
  ADD COLUMN `mailboxPasswordProvider` VARCHAR(191) NULL,
  ADD COLUMN `mailboxPasswordBaseUrl` VARCHAR(191) NULL,
  ADD COLUMN `mailboxPasswordUsername` VARCHAR(191) NULL,
  ADD COLUMN `encryptedMailboxPasswordSecret` TEXT NULL,
  ADD COLUMN `mailboxPasswordAllowInsecureTls` BOOLEAN NOT NULL DEFAULT false;
