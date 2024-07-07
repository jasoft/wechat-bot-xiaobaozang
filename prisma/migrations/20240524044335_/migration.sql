-- CreateTable
CREATE TABLE `Message` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `topicId` VARCHAR(191) NOT NULL,
    `isRoom` BOOLEAN NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `roomName` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `summarized` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
