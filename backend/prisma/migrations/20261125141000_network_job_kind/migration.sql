-- Which automation jobs a collector can actually run.
ALTER TABLE "NetworkAutomationJob" ADD COLUMN "kind" TEXT,
ADD COLUMN "lastResult" TEXT;
