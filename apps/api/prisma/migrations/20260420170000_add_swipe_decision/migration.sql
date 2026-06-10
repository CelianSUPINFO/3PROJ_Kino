CREATE TYPE "SwipeChoice" AS ENUM ('SMASH', 'PASS');

CREATE TABLE "SwipeDecision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "choice" "SwipeChoice" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwipeDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SwipeDecision_userId_tmdbId_mediaType_key" ON "SwipeDecision"("userId", "tmdbId", "mediaType");

CREATE INDEX "SwipeDecision_userId_updatedAt_idx" ON "SwipeDecision"("userId", "updatedAt");

ALTER TABLE "SwipeDecision" ADD CONSTRAINT "SwipeDecision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
