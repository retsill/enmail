-- DropForeignKey
ALTER TABLE `addon_licenses` DROP FOREIGN KEY `addon_licenses_addonId_fkey`;

-- AlterTable
ALTER TABLE `addons` DROP COLUMN `status`,
    ADD COLUMN `clientId` VARCHAR(191) NULL,
    ADD COLUMN `enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `encryptedClientSecret` TEXT NULL,
    ADD COLUMN `redirectUri` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `mail_accounts` ADD COLUMN `displayName` VARCHAR(191) NULL,
    ADD COLUMN `signature` TEXT NULL;

-- AlterTable
ALTER TABLE `mail_folders` ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `isCustom` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `mail_messages` ADD COLUMN `category` ENUM('PRIMARY', 'SOCIAL', 'PROMOTIONS', 'UPDATES', 'FORUMS') NOT NULL DEFAULT 'PRIMARY',
    MODIFY `messageId` TEXT NULL,
    MODIFY `fromAddress` TEXT NULL,
    MODIFY `fromName` TEXT NULL;

-- AlterTable
ALTER TABLE `system_settings` ADD COLUMN `logoUrlDark` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
    ADD COLUMN `backgroundOpacity` INTEGER NOT NULL DEFAULT 82,
    ADD COLUMN `composeStyle` ENUM('POPUP', 'FULLSCREEN') NOT NULL DEFAULT 'POPUP',
    ADD COLUMN `density` ENUM('DEFAULT', 'COMFORTABLE', 'COMPACT') NOT NULL DEFAULT 'DEFAULT',
    ADD COLUMN `enabledCategories` JSON NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `layoutColumns` INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN `pageSize` INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN `themeBackground` VARCHAR(191) NULL,
    ADD COLUMN `themeBackgroundType` ENUM('NONE', 'COLOR', 'IMAGE') NOT NULL DEFAULT 'NONE';

-- DropTable
DROP TABLE `addon_licenses`;

-- CreateTable
CREATE TABLE `contacts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `timesUsed` INTEGER NOT NULL DEFAULT 1,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contacts_userId_idx`(`userId`),
    UNIQUE INDEX `contacts_userId_email_key`(`userId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_pages` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

