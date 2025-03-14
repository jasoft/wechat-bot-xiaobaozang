-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "topicId" TEXT NOT NULL,
    "isRoom" BOOLEAN NOT NULL,
    "role" TEXT NOT NULL,
    "roomName" TEXT,
    "name" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "content" VARCHAR(4096) NOT NULL,
    "type" TEXT,
    "summarized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "cron" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "botId" TEXT NOT NULL DEFAULT 'wxid_lzn88besya2s12',
    "roomId" TEXT NOT NULL DEFAULT 'filehelper',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);
