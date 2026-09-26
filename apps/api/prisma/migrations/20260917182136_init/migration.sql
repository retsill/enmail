-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `provider` ENUM('IMAP', 'GMAIL', 'OUTLOOK', 'YAHOO') NOT NULL DEFAULT 'IMAP',
    `label` VARCHAR(191) NOT NULL,
    `emailAddress` VARCHAR(191) NOT NULL,
    `imapHost` VARCHAR(191) NULL,
    `imapPort` INTEGER NULL,
    `imapTls` BOOLEAN NOT NULL DEFAULT true,
    `smtpHost` VARCHAR(191) NULL,
    `smtpPort` INTEGER NULL,
    `smtpTls` BOOLEAN NOT NULL DEFAULT true,
    `username` VARCHAR(191) NULL,
    `encryptedPassword` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mail_accounts_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_folders` (
    `id` VARCHAR(191) NOT NULL,
    `mailAccountId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `specialUse` VARCHAR(191) NULL,
    `unreadCount` INTEGER NOT NULL DEFAULT 0,
    `totalCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mail_folders_mailAccountId_idx`(`mailAccountId`),
    UNIQUE INDEX `mail_folders_mailAccountId_path_key`(`mailAccountId`, `path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_messages` (
    `id` VARCHAR(191) NOT NULL,
    `mailAccountId` VARCHAR(191) NOT NULL,
    `folderId` VARCHAR(191) NOT NULL,
    `uid` INTEGER NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `subject` TEXT NULL,
    `fromAddress` VARCHAR(191) NULL,
    `fromName` VARCHAR(191) NULL,
    `toAddresses` JSON NULL,
    `ccAddresses` JSON NULL,
    `snippet` TEXT NULL,
    `hasAttachments` BOOLEAN NOT NULL DEFAULT false,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `isFlagged` BOOLEAN NOT NULL DEFAULT false,
    `isDraft` BOOLEAN NOT NULL DEFAULT false,
    `receivedAt` DATETIME(3) NULL,
    `sizeBytes` INTEGER NULL,
    `bodyCache` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mail_messages_mailAccountId_idx`(`mailAccountId`),
    INDEX `mail_messages_folderId_idx`(`folderId`),
    UNIQUE INDEX `mail_messages_folderId_uid_key`(`folderId`, `uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addons` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('AVAILABLE', 'INSTALLED', 'LOCKED') NOT NULL DEFAULT 'AVAILABLE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `addons_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addon_licenses` (
    `id` VARCHAR(191) NOT NULL,
    `addonId` VARCHAR(191) NOT NULL,
    `licenseKey` VARCHAR(191) NOT NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT false,
    `lastCheckedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `addon_licenses_licenseKey_key`(`licenseKey`),
    INDEX `addon_licenses_addonId_idx`(`addonId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mail_accounts` ADD CONSTRAINT `mail_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_folders` ADD CONSTRAINT `mail_folders_mailAccountId_fkey` FOREIGN KEY (`mailAccountId`) REFERENCES `mail_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_messages` ADD CONSTRAINT `mail_messages_mailAccountId_fkey` FOREIGN KEY (`mailAccountId`) REFERENCES `mail_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_messages` ADD CONSTRAINT `mail_messages_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `mail_folders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addon_licenses` ADD CONSTRAINT `addon_licenses_addonId_fkey` FOREIGN KEY (`addonId`) REFERENCES `addons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
