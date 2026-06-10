DELETE FROM "Report" a
USING "Report" b
WHERE a."reporterId" = b."reporterId"
  AND a."reviewId" = b."reviewId"
  AND a."createdAt" < b."createdAt";

CREATE UNIQUE INDEX "Report_reporterId_reviewId_key" ON "Report"("reporterId", "reviewId");
