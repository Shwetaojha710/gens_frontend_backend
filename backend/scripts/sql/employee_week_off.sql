-- Employee-wise flexible week off (additive only; existing data untouched)
-- 1) Fixed week-off days per employee, e.g. ["Tuesday"] ; NULL/[] = use shift week off (old behaviour)
ALTER TABLE "empPersonals" ADD COLUMN IF NOT EXISTS "week_off_days" JSONB NULL;

-- 2) Date-wise roster override
CREATE TABLE IF NOT EXISTS "employee_week_off_roster" (
  "id"         UUID PRIMARY KEY,
  "tenantId"   UUID NOT NULL,
  "branchId"   UUID NULL,
  "employeeId" UUID NOT NULL,
  "date"       DATE NOT NULL,
  "type"       VARCHAR(10) NOT NULL CHECK ("type" IN ('WO','WORKING')),
  "remark"     VARCHAR(255) NULL,
  "createdBy"  UUID NULL,
  "updatedBy"  UUID NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uq_emp_week_off_roster_tenant_emp_date"
  ON "employee_week_off_roster" ("tenantId", "employeeId", "date");
CREATE INDEX IF NOT EXISTS "ix_emp_week_off_roster_tenant_date"
  ON "employee_week_off_roster" ("tenantId", "date");
