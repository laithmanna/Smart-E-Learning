-- CreateEnum
CREATE TYPE "AttachmentCategory" AS ENUM ('MATERIAL', 'TOPICS', 'PRESENTATION', 'CERTIFICATE', 'OTHER');

-- AlterTable
ALTER TABLE "CourseAttachment" ADD COLUMN     "category" "AttachmentCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "certificateFileName" TEXT,
ADD COLUMN     "certificateFilePath" TEXT,
ADD COLUMN     "certificateUploadedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CourseAttachment_category_idx" ON "CourseAttachment"("category");
