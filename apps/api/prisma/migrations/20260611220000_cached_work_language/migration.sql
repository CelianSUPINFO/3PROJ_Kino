ALTER TABLE "CachedWork" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'fr-FR';

DROP INDEX "CachedWork_tmdbId_mediaType_key";

CREATE UNIQUE INDEX "CachedWork_tmdbId_mediaType_language_key"
ON "CachedWork"("tmdbId", "mediaType", "language");

CREATE INDEX "Comment_reviewId_parentId_idx"
ON "Comment"("reviewId", "parentId");
