-- AlterTable
ALTER TABLE `mail_accounts` ADD COLUMN `isPrimary` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `authSource` ENUM('LOCAL', 'MAIL_SERVER') NOT NULL DEFAULT 'LOCAL',
    MODIFY `passwordHash` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `mail_server_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `imapHost` VARCHAR(191) NOT NULL,
    `imapPort` INTEGER NOT NULL DEFAULT 993,
    `imapTls` BOOLEAN NOT NULL DEFAULT true,
    `smtpHost` VARCHAR(191) NOT NULL,
    `smtpPort` INTEGER NOT NULL DEFAULT 587,
    `smtpTls` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `siteName` VARCHAR(191) NOT NULL DEFAULT 'Webmail',
    `logoUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `defaultLocale` VARCHAR(191) NOT NULL DEFAULT 'es',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
