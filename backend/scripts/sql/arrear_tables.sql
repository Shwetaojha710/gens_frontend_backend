-- Arrear Management schema (PostgreSQL)
-- Safe to run if tables already exist (IF NOT EXISTS / guarded indexes).
-- Prefer: node scripts/create-arrear-tables.js

CREATE TABLE IF NOT EXISTS arrears (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "branchId" UUID,
  "employeeId" UUID NOT NULL REFERENCES "empPersonals"(id) ON DELETE CASCADE,
  "effectiveYear" INTEGER NOT NULL,
  "effectiveMonth" INTEGER NOT NULL,
  "implementationYear" INTEGER NOT NULL,
  "implementationMonth" INTEGER NOT NULL,
  "payoutYear" INTEGER NOT NULL,
  "payoutMonth" INTEGER NOT NULL,
  "revisedMonthlySalary" DOUBLE PRECISION,
  "totalArrear" DOUBLE PRECISION NOT NULL DEFAULT 0,
  remark TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid')),
  "paidBillId" INTEGER,
  "allowanceId" UUID,
  "approverId" UUID,
  "approvedAt" TIMESTAMP WITH TIME ZONE,
  "rejectedBy" UUID,
  "rejectedAt" TIMESTAMP WITH TIME ZONE,
  "rejectRemark" TEXT,
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arrear_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "arrearId" UUID NOT NULL REFERENCES arrears(id) ON DELETE CASCADE,
  "tenantId" UUID NOT NULL,
  "branchId" UUID,
  "employeeId" UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  "actualPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "revisedSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
  difference DOUBLE PRECISION NOT NULL DEFAULT 0,
  "arrearAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "componentBreakup" JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  "createdBy" UUID,
  "updatedBy" UUID,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arrear_employee
  ON arrears ("tenantId", "branchId", "employeeId");

CREATE INDEX IF NOT EXISTS idx_arrear_status_payout
  ON arrears ("tenantId", "branchId", status, "payoutYear", "payoutMonth");

CREATE UNIQUE INDEX IF NOT EXISTS uq_arrear_detail_month
  ON arrear_details ("arrearId", year, month);

CREATE UNIQUE INDEX IF NOT EXISTS uq_arrear_active_period
  ON arrears (
    "tenantId",
    "branchId",
    "employeeId",
    "effectiveYear",
    "effectiveMonth",
    "implementationYear",
    "implementationMonth"
  )
  WHERE status IN ('draft', 'pending', 'approved', 'paid');
