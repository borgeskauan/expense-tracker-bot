-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RecurringTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "monthOfYear" INTEGER,
    "startDate" TEXT NOT NULL,
    "nextDue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_RecurringTransaction" ("amount", "category", "createdAt", "dayOfMonth", "dayOfWeek", "description", "frequency", "id", "interval", "isActive", "monthOfYear", "nextDue", "startDate", "type", "updatedAt", "userId") 
SELECT 
  "amount", 
  "category", 
  "createdAt", 
  "dayOfMonth", 
  "dayOfWeek", 
  "description", 
  "frequency", 
  "id", 
  "interval", 
  "isActive", 
  "monthOfYear", 
  strftime('%Y-%m-%dT%H:%M:%fZ', "nextDue" / 1000.0, 'unixepoch') as "nextDue",
  strftime('%Y-%m-%dT%H:%M:%fZ', "startDate" / 1000.0, 'unixepoch') as "startDate",
  "type", 
  "updatedAt", 
  "userId" 
FROM "RecurringTransaction";
DROP TABLE "RecurringTransaction";
ALTER TABLE "new_RecurringTransaction" RENAME TO "RecurringTransaction";
CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");
CREATE INDEX "RecurringTransaction_nextDue_idx" ON "RecurringTransaction"("nextDue");
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'expense',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Transaction" ("amount", "category", "createdAt", "date", "description", "id", "type", "updatedAt", "userId") 
SELECT 
  "amount", 
  "category", 
  "createdAt", 
  strftime('%Y-%m-%dT%H:%M:%fZ', "date" / 1000.0, 'unixepoch') as "date",
  "description", 
  "id", 
  "type", 
  "updatedAt", 
  "userId" 
FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
