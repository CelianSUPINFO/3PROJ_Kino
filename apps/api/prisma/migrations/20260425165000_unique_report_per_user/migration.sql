-- One open report per (reporter, review) pair
CREATE UNIQUE INDEX "Report_reporterId_reviewId_key" ON "Report"("reporterId", "reviewId");
