/**
 * copy-master-data.js
 *
 * Copies all master-table records from SOURCE_TENANT to TARGET_TENANT.
 * BranchIds are remapped by branch name — source and target branches with
 * the same name get matched, so the copied records are visible in the app.
 * Records whose branch name has no match in the target get branchId = null.
 *
 * Safe to re-run: deletes previously-imported records first (identified by
 * having a SOURCE branchId), then re-inserts everything cleanly.
 *
 * Usage (from the backend/ directory):
 *   node scripts/copy-master-data.js
 */

require('dotenv').config();
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

const SOURCE_TENANT = '7360976d-94ab-49b5-83b7-65fcfcf63830';
const TARGET_TENANT = '8474e354-8224-4056-beb9-3f249651faa9';

const dbConfig = {
  host:     process.env.DB_HOST     || '15.207.155.107',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'Quaere0007@2024',
  database: process.env.DB_DATABASE || 'gens_6_april',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
};

async function run() {
  const client = new Client(dbConfig);
  await client.connect();
  console.log('✅  Connected to', dbConfig.database, '@', dbConfig.host);
  console.log('    SOURCE :', SOURCE_TENANT);
  console.log('    TARGET :', TARGET_TENANT, '\n');

  try {

    // ── Build branch name → TARGET branchId map ────────────────────────────
    const { rows: srcBranches } = await client.query(
      `SELECT id, name FROM branches WHERE "tenantId" = $1`, [SOURCE_TENANT]
    );
    const { rows: tgtBranches } = await client.query(
      `SELECT id, name FROM branches WHERE "tenantId" = $1`, [TARGET_TENANT]
    );

    // map: sourceBranchId → targetBranchId  (matched by branch name)
    const branchIdMap = {};
    for (const src of srcBranches) {
      const tgt = tgtBranches.find(t => t.name.trim().toLowerCase() === src.name.trim().toLowerCase());
      branchIdMap[src.id] = tgt ? tgt.id : null;
    }

    console.log('🔀  Branch ID mapping:');
    for (const src of srcBranches) {
      const tgtId = branchIdMap[src.id];
      console.log(`    ${src.name.padEnd(15)} ${src.id} → ${tgtId || '(no match — null)'}`);
    }
    console.log();

    // Collect all SOURCE branchIds so we can delete previously-imported records
    const sourceBranchIds = srcBranches.map(b => b.id);

    // ── Step 1 – Delete previously-imported records (wrong branchIds) ────────
    console.log('🗑️   Cleaning up previously-imported records with wrong branchIds...');
    const deleteTables = [
      'interview_rounds', 'designations',   // dependents first
      'departments', '"employmentTypes"', '"documentTypes"', '"HolidayTypes"',
      'master_components', 'shifts', 'leave_masters', 'round_types',
      '"attendanceSettings"', 'currencies', 'prefixes',
      // employees & their dependent data
      'leave_applications', 'leave_balances', 'device_location_logs', '"empPersonals"',
    ];
    for (const tbl of deleteTables) {
      if (sourceBranchIds.length === 0) break;
      const placeholders = sourceBranchIds.map((_, i) => `$${i + 2}`).join(',');
      const result = await client.query(
        `DELETE FROM ${tbl} WHERE "tenantId" = $1 AND "branchId" IN (${placeholders})`,
        [TARGET_TENANT, ...sourceBranchIds]
      );
      if (result.rowCount > 0)
        console.log(`  ✓  ${tbl.replace(/"/g, '').padEnd(20)} deleted ${result.rowCount} old records`);
    }
    console.log();

    // ── Helper to resolve branchId ───────────────────────────────────────────
    const mapBranch = (srcBranchId) => {
      if (!srcBranchId) return null;
      return branchIdMap.hasOwnProperty(srcBranchId) ? branchIdMap[srcBranchId] : null;
    };

    let grandTotal = 0;
    function log(table, found, inserted, extra = '') {
      console.log(`  📁  ${table.padEnd(22)} ${String(found).padEnd(8)} found  ${inserted} inserted${extra}`);
    }

    // ── 1. departments ──────────────────────────────────────────────────────
    const deptIdMap = {};
    {
      const { rows } = await client.query(
        `SELECT * FROM departments WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);

        const dup = await client.query(
          `SELECT id FROM departments WHERE "tenantId"=$1 AND name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.name, targetBranchId]
        );
        if (dup.rows.length) {
          deptIdMap[r.id] = dup.rows[0].id;
          continue;
        }
        const newId = uuidv4();
        deptIdMap[r.id] = newId;
        await client.query(
          `INSERT INTO departments (id,"tenantId","branchId",name,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [newId, TARGET_TENANT, targetBranchId, r.name, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('departments', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 2. designations ─────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM designations WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0, skipped = 0;
      for (const r of rows) {
        const newDeptId = deptIdMap[r.department];
        if (!newDeptId) { skipped++; continue; }
        const targetBranchId = mapBranch(r.branchId);

        const dup = await client.query(
          `SELECT id FROM designations WHERE "tenantId"=$1 AND name=$2 AND department=$3 LIMIT 1`,
          [TARGET_TENANT, r.name, newDeptId]
        );
        if (dup.rows.length) continue;

        await client.query(
          `INSERT INTO designations (id,"tenantId","branchId",department,name,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId, newDeptId, r.name, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('designations', rows.length, inserted, skipped ? `, ${skipped} skipped (dept missing)` : '');
      grandTotal += inserted;
    }

    // ── 3. employmentTypes ──────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM "employmentTypes" WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM "employmentTypes" WHERE "tenantId"=$1 AND name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.name, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO "employmentTypes" (id,"tenantId","branchId",name,duration_type,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId, r.name, r.duration_type, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('employmentTypes', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 4. documentTypes ────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM "documentTypes" WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM "documentTypes" WHERE "tenantId"=$1 AND type=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.type, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO "documentTypes" (id,"tenantId","branchId",type,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId, r.type, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('documentTypes', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 5. HolidayTypes ─────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM "HolidayTypes" WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM "HolidayTypes" WHERE "tenantId"=$1 AND name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.name, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO "HolidayTypes" (id,"tenantId","branchId",name,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId, r.name, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('HolidayTypes', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 6. master_components ─────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM master_components WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM master_components WHERE "tenantId"=$1 AND component_name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.component_name, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO master_components
             (id,"tenantId","branchId",component_name,value,value_type,amount,
              dependent_component,component_description,component_type,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
          [
            uuidv4(), TARGET_TENANT, targetBranchId,
            r.component_name, r.value, r.value_type, r.amount,
            r.dependent_component !== null && r.dependent_component !== undefined
              ? JSON.stringify(r.dependent_component) : null,
            r.component_description, r.component_type, r.status,
            r.createdBy, r.updatedBy,
          ]
        );
        inserted++;
      }
      log('master_components', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 7. shifts ────────────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM shifts WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const { rows: dup } = await client.query(
          `SELECT id FROM shifts WHERE "tenantId"=$1 AND shift=$2
           AND day_of_week IS NOT DISTINCT FROM $3 AND "branchId" IS NOT DISTINCT FROM $4 LIMIT 1`,
          [TARGET_TENANT, r.shift, r.day_of_week, targetBranchId]
        );
        if (dup.length) continue;
        await client.query(
          `INSERT INTO shifts
             (id,"tenantId","branchId",shift,day_of_week,"startTime","endTime",
              "workingHours",status,is_week_off,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`,
          [
            uuidv4(), TARGET_TENANT, targetBranchId,
            r.shift, r.day_of_week, r.startTime, r.endTime,
            r.workingHours, r.status, r.is_week_off, r.createdBy, r.updatedBy,
          ]
        );
        inserted++;
      }
      log('shifts', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 8. leave_masters ─────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM leave_masters WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM leave_masters WHERE "tenantId"=$1 AND "leaveCode"=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.leaveCode, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO leave_masters
             (id,"tenantId","branchId","leaveName","leaveCode","isPaid","allowedPerYear",
              "carryForward","maxCarryForward","enCashable","genderRestriction",
              "requiresApproval","applyBeforeDays",description,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())`,
          [
            uuidv4(), TARGET_TENANT, targetBranchId,
            r.leaveName, r.leaveCode, r.isPaid, r.allowedPerYear,
            r.carryForward, r.maxCarryForward, r.enCashable,
            r.genderRestriction, r.requiresApproval, r.applyBeforeDays,
            r.description, r.createdBy, r.updatedBy,
          ]
        );
        inserted++;
      }
      log('leave_masters', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 9. round_types ──────────────────────────────────────────────────────
    const roundTypeIdMap = {};
    {
      const { rows } = await client.query(
        `SELECT * FROM round_types WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM round_types WHERE "tenantId"=$1 AND name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.name, targetBranchId]
        );
        if (dup.rows.length) {
          roundTypeIdMap[r.id] = dup.rows[0].id;
          continue;
        }
        const newId = uuidv4();
        roundTypeIdMap[r.id] = newId;
        await client.query(
          `INSERT INTO round_types (id,"tenantId","branchId",name,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [newId, TARGET_TENANT, targetBranchId, r.name, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('round_types', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 10. interview_rounds ────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM interview_rounds WHERE "tenantId" = $1 ORDER BY order_sequence`,
        [SOURCE_TENANT]
      );
      let inserted = 0, nullRt = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM interview_rounds WHERE "tenantId"=$1 AND round_name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.round_name, targetBranchId]
        );
        if (dup.rows.length) continue;
        let newRoundTypeId = null;
        if (r.round_type) {
          newRoundTypeId = roundTypeIdMap[r.round_type] || null;
          if (!newRoundTypeId) nullRt++;
        }
        await client.query(
          `INSERT INTO interview_rounds
             (id,"tenantId","branchId",round_name,round_type,order_sequence,
              duration_minutes,is_mandatory,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),NOW())`,
          [
            uuidv4(), TARGET_TENANT, targetBranchId,
            r.round_name, newRoundTypeId, r.order_sequence,
            r.duration_minutes, r.is_mandatory, r.status,
            r.createdBy, r.updatedBy,
          ]
        );
        inserted++;
      }
      log('interview_rounds', rows.length, inserted, nullRt ? `, ${nullRt} with null round_type` : '');
      grandTotal += inserted;
    }

    // ── 11. attendanceSettings ──────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM "attendanceSettings" WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        // One setting per branch — skip if already exists for same branch in target
        const dup = await client.query(
          `SELECT id FROM "attendanceSettings" WHERE "tenantId"=$1 AND "branchId" IS NOT DISTINCT FROM $2 LIMIT 1`,
          [TARGET_TENANT, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO "attendanceSettings"
             (id,"tenantId","branchId","lateAllowanceMin","graceMinutes","halfDayThreshold","halfdayToAbsentMin","createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId,
           r.lateAllowanceMin, r.graceMinutes, r.halfDayThreshold, r.halfdayToAbsentMin,
           r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('attendanceSettings', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 12. currencies ──────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM currencies WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM currencies WHERE "tenantId"=$1 AND name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.name, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO currencies (id,"tenantId","branchId",name,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId, r.name, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('currencies', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 13. prefixes ────────────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM prefixes WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0;
      for (const r of rows) {
        const targetBranchId = mapBranch(r.branchId);
        const dup = await client.query(
          `SELECT id FROM prefixes WHERE "tenantId"=$1 AND name=$2 AND "branchId" IS NOT DISTINCT FROM $3 LIMIT 1`,
          [TARGET_TENANT, r.name, targetBranchId]
        );
        if (dup.rows.length) continue;
        await client.query(
          `INSERT INTO prefixes (id,"tenantId","branchId",name,status,"createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
          [uuidv4(), TARGET_TENANT, targetBranchId, r.name, r.status, r.createdBy, r.updatedBy]
        );
        inserted++;
      }
      log('prefixes', rows.length, inserted);
      grandTotal += inserted;
    }

    // ── 14. empPersonals (employees) ─────────────────────────────────────────
    // FKs remapped: empType → employmentTypes, designationId → designations,
    //               departmentId → departments, branchId → branches
    // email is globally unique — changed to  original_local+_COPY@domain
    // Sensitive tokens cleared; adhaarNo/panNo set to null to avoid conflicts
    // profileImage filename kept as-is (same server, same upload/ folder)
    const empIdMap = {};  // sourceEmpId → targetEmpId  (used by leave steps)
    {
      const { rows: srcEmps } = await client.query(
        `SELECT * FROM "empPersonals" WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );

      // Build empType name → target empTypeId map
      const { rows: tgtEmpTypes } = await client.query(
        `SELECT id, name FROM "employmentTypes" WHERE "tenantId" = $1`, [TARGET_TENANT]
      );
      const empTypeNameMap = {};
      tgtEmpTypes.forEach(e => { empTypeNameMap[e.name.toLowerCase()] = e.id; });
      const { rows: srcEmpTypes } = await client.query(
        `SELECT id, name FROM "employmentTypes" WHERE "tenantId" = $1`, [SOURCE_TENANT]
      );
      const srcEmpTypeIdToName = {};
      srcEmpTypes.forEach(e => { srcEmpTypeIdToName[e.id] = e.name.toLowerCase(); });

      // Build designation name → target designationId map
      const { rows: tgtDesigs } = await client.query(
        `SELECT id, name FROM designations WHERE "tenantId" = $1`, [TARGET_TENANT]
      );
      const desigNameMap = {};
      tgtDesigs.forEach(d => { desigNameMap[d.name.toLowerCase()] = d.id; });
      const { rows: srcDesigs } = await client.query(
        `SELECT id, name FROM designations WHERE "tenantId" = $1`, [SOURCE_TENANT]
      );
      const srcDesigIdToName = {};
      srcDesigs.forEach(d => { srcDesigIdToName[d.id] = d.name.toLowerCase(); });

      let inserted = 0, skipped = 0;
      for (const r of srcEmps) {
        const targetBranchId = mapBranch(r.branchId);

        // Make email unique: insert "+copy" before @
        const emailParts = (r.email || '').split('@');
        const newEmail = emailParts.length === 2
          ? `${emailParts[0]}_copy@${emailParts[1]}`
          : `${r.email}_copy`;

        // Check duplicate — by empCode if present, else by modified email
        let dupId = null;
        if (r.empCode) {
          const dup = await client.query(
            `SELECT id FROM "empPersonals" WHERE "tenantId"=$1 AND "empCode"=$2 LIMIT 1`,
            [TARGET_TENANT, r.empCode]
          );
          if (dup.rows.length) dupId = dup.rows[0].id;
        }
        if (!dupId) {
          const dup = await client.query(
            `SELECT id FROM "empPersonals" WHERE email=$1 LIMIT 1`, [newEmail]
          );
          if (dup.rows.length) dupId = dup.rows[0].id;
        }
        if (dupId) {
          empIdMap[r.id] = dupId;   // still map so leave/tracking can resolve
          skipped++;
          continue;
        }

        // Remap FK: empType
        let newEmpType = null;
        if (r.empType && srcEmpTypeIdToName[r.empType]) {
          newEmpType = empTypeNameMap[srcEmpTypeIdToName[r.empType]] || null;
        }

        // Remap FK: designationId
        let newDesigId = null;
        if (r.designationId && srcDesigIdToName[r.designationId]) {
          newDesigId = desigNameMap[srcDesigIdToName[r.designationId]] || null;
        }

        // Remap FK: departmentId  (use deptIdMap already built above)
        const newDeptId = r.departmentId ? (deptIdMap[r.departmentId] || null) : null;

        const newId = uuidv4();
        empIdMap[r.id] = newId;   // track for leave remapping
        await client.query(
          `INSERT INTO "empPersonals"
             (id,"tenantId","branchId","firstName","lastName",email,mobile,"alternateMobile",
              "permanentAddress","currentAddress","dateOfBirth",age,gender,"martialStatus",
              "adhaarNo","panNo","fatherName",role,"motherName","guarantorName","bloodGroup",
              nationality,"pinCode",state,"emp_status",status,country,city,
              "joiningDate","exitDate","reportingPersonId","empType","createdBy","updatedBy",
              "profileImage","empCode","shift_id","designationId","departmentId",
              token,"webToken","deviceId","deviceToken","isLocation","isofflineAtt",
              "isofflineAllTimeAtt","isContractual","hourlyRate","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                   $15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
                   $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,
                   NULL,NULL,NULL,NULL,$40,$41,$42,$43,$44,NOW(),NOW())`,
          [
            newId, TARGET_TENANT, targetBranchId,
            r.firstName, r.lastName, newEmail,
            null,  // mobile → null to avoid (tenantId, mobile) unique conflict
            null,  // alternateMobile → null to avoid (tenantId, alternateMobile) unique conflict
            r.permanentAddress, r.currentAddress, r.dateOfBirth, r.age, r.gender, r.martialStatus,
            null, null,   // adhaarNo, panNo → null to avoid unique conflicts
            r.fatherName, r.role, r.motherName, r.guarantorName, r.bloodGroup,
            r.nationality, r.pinCode, r.state, r.emp_status, r.status, r.country, r.city,
            r.joiningDate, r.exitDate,
            null,           // reportingPersonId → null (can't remap intra-tenant)
            newEmpType, r.createdBy, r.updatedBy,
            r.profileImage, r.empCode, r.shift_id, newDesigId, newDeptId,
            // tokens cleared ↑ (NULL hardcoded in query)
            r.isLocation, r.isofflineAtt, r.isofflineAllTimeAtt, r.isContractual, r.hourlyRate,
          ]
        );
        inserted++;
      }
      log('empPersonals (employees)', srcEmps.length, inserted, skipped ? `, ${skipped} skipped (duplicate empCode/email)` : '');
      grandTotal += inserted;
    }

    // ── Build leaveTypeId map (source leave_master.id → target leave_master.id)
    //    matched by leaveCode (the natural unique key)
    const leaveTypeIdMap = {};
    {
      const { rows: srcLT } = await client.query(
        `SELECT id, "leaveCode" FROM leave_masters WHERE "tenantId" = $1`, [SOURCE_TENANT]
      );
      const { rows: tgtLT } = await client.query(
        `SELECT id, "leaveCode" FROM leave_masters WHERE "tenantId" = $1`, [TARGET_TENANT]
      );
      const tgtLeaveCodeToId = {};
      tgtLT.forEach(r => { tgtLeaveCodeToId[r.leaveCode] = r.id; });
      srcLT.forEach(r => {
        if (tgtLeaveCodeToId[r.leaveCode]) leaveTypeIdMap[r.id] = tgtLeaveCodeToId[r.leaveCode];
      });
    }

    // ── 15. leave_balances ──────────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM leave_balances WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0, skipped = 0;
      for (const r of rows) {
        const newEmpId      = empIdMap[r.employeeId];
        const newLeaveTypeId = leaveTypeIdMap[r.leaveTypeId];
        if (!newEmpId || !newLeaveTypeId) { skipped++; continue; }

        const targetBranchId = mapBranch(r.branchId);

        // Skip if same employee + leaveType + year + month already exists
        const dup = await client.query(
          `SELECT id FROM leave_balances
            WHERE "tenantId"=$1 AND "employeeId"=$2 AND "leaveTypeId"=$3
              AND year=$4 AND month IS NOT DISTINCT FROM $5 LIMIT 1`,
          [TARGET_TENANT, newEmpId, newLeaveTypeId, r.year, r.month]
        );
        if (dup.rows.length) continue;

        await client.query(
          `INSERT INTO leave_balances
             (id,"employeeId","branchId","leaveTypeId",year,month,
              "totalAssigned","usedLeaves","carryForwarded","remainingLeaves",
              "prevremainingLeaves","prevusedLeaves","tenantId","createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())`,
          [
            uuidv4(), newEmpId, targetBranchId, newLeaveTypeId,
            r.year, r.month,
            r.totalAssigned, r.usedLeaves, r.carryForwarded, r.remainingLeaves,
            r.prevremainingLeaves, r.prevusedLeaves,
            TARGET_TENANT, r.createdBy, r.updatedBy,
          ]
        );
        inserted++;
      }
      log('leave_balances', rows.length, inserted, skipped ? `, ${skipped} skipped (emp/leaveType not mapped)` : '');
      grandTotal += inserted;
    }

    // ── 16. leave_applications ──────────────────────────────────────────────
    {
      const { rows } = await client.query(
        `SELECT * FROM leave_applications WHERE "tenantId" = $1 ORDER BY "createdAt"`,
        [SOURCE_TENANT]
      );
      let inserted = 0, skipped = 0;
      for (const r of rows) {
        const newEmpId       = empIdMap[r.employeeId];
        const newLeaveTypeId = leaveTypeIdMap[r.leaveTypeId];
        if (!newEmpId || !newLeaveTypeId) { skipped++; continue; }

        const targetBranchId = mapBranch(r.branchId);

        // Skip duplicate: same employee + leaveType + fromDate
        const dup = await client.query(
          `SELECT id FROM leave_applications
            WHERE "tenantId"=$1 AND "employeeId"=$2 AND "leaveTypeId"=$3
              AND "fromDate" IS NOT DISTINCT FROM $4 LIMIT 1`,
          [TARGET_TENANT, newEmpId, newLeaveTypeId, r.fromDate]
        );
        if (dup.rows.length) continue;

        // approverId / recommendedId / canceledId reference employees —
        // remap if in our map, otherwise null
        const newApproverId    = r.approverId    ? (empIdMap[r.approverId]    || null) : null;
        const newRecommendedId = r.recommendedId ? (empIdMap[r.recommendedId] || null) : null;
        const newCanceledId    = r.canceledId    ? (empIdMap[r.canceledId]    || null) : null;

        await client.query(
          `INSERT INTO leave_applications
             (id,"employeeId","branchId","leaveTypeId","compOffId",
              "fromDate","toDate",duration_type,to_duration_type,
              days,reason,status,"approverId","recommendedId","canceledId",
              "appliedOn","tenantId","createdBy","updatedBy","createdAt","updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())`,
          [
            uuidv4(), newEmpId, targetBranchId, newLeaveTypeId, null,
            r.fromDate, r.toDate, r.duration_type, r.to_duration_type,
            r.days, r.reason, r.status,
            newApproverId, newRecommendedId, newCanceledId,
            r.appliedOn, TARGET_TENANT, r.createdBy, r.updatedBy,
          ]
        );
        inserted++;
      }
      log('leave_applications', rows.length, inserted, skipped ? `, ${skipped} skipped (emp/leaveType not mapped)` : '');
      grandTotal += inserted;
    }

    // ── 17. device_location_logs (tracking) ─────────────────────────────────
    {
      const BATCH = 200;
      // Count first for progress display
      const { rows: [{ count }] } = await client.query(
        `SELECT count(*) FROM device_location_logs WHERE "tenantId" = $1`, [SOURCE_TENANT]
      );
      const total = parseInt(count, 10);
      let inserted = 0, skipped = 0, offset = 0;

      while (offset < total) {
        const { rows } = await client.query(
          `SELECT * FROM device_location_logs WHERE "tenantId" = $1
           ORDER BY "createdAt" LIMIT $2 OFFSET $3`,
          [SOURCE_TENANT, BATCH, offset]
        );
        offset += rows.length;
        if (rows.length === 0) break;

        // Build batch VALUES — skip rows whose employeeId is unmapped
        const vals = [];
        const params = [];
        let p = 1;

        for (const r of rows) {
          const newEmpId      = r.employeeId ? (empIdMap[r.employeeId] || null) : null;
          const targetBranchId = mapBranch(r.branchId);

          // skip entirely if no employee mapping (log belongs to unmapped employee)
          if (r.employeeId && !newEmpId) { skipped++; continue; }

          vals.push(
            `($${p},$${p+1},$${p+2},$${p+3},$${p+4},$${p+5},$${p+6},$${p+7},$${p+8},$${p+9},$${p+10},$${p+11},$${p+12},$${p+13},$${p+14},$${p+15},$${p+16},$${p+17},$${p+18},$${p+19},$${p+20},$${p+21},$${p+22},$${p+23},$${p+24},NOW(),NOW())`
          );
          params.push(
            uuidv4(), TARGET_TENANT, targetBranchId, newEmpId,
            r.device_id, r.device_os,
            r.latitude, r.longitude, r.altitude, r.accuracy,
            r.altitude_accuracy, r.heading, r.speed,
            r.mode, r.network_mode, r.tracked_at, r.address,
            r.visit_place, r.purpose, r.remark, r.feedback,
            r.location_type, r.client_name, r.client_phone_no, r.doc
          );
          p += 25;
        }

        if (vals.length > 0) {
          await client.query(
            `INSERT INTO device_location_logs
               (id,"tenantId","branchId","employeeId",
                device_id,device_os,
                latitude,longitude,altitude,accuracy,
                altitude_accuracy,heading,speed,
                mode,network_mode,tracked_at,address,
                visit_place,purpose,remark,feedback,
                location_type,client_name,client_phone_no,doc,
                "createdAt","updatedAt")
             VALUES ${vals.join(',')}`,
            params
          );
          inserted += vals.length;
        }
      }

      log('device_location_logs', total, inserted, skipped ? `, ${skipped} skipped (emp not mapped)` : '');
      grandTotal += inserted;
    }

    console.log();
    console.log(`🎉  Done — ${grandTotal} total records inserted into target tenant.`);

  } catch (err) {
    console.error('\n❌  Migration failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('🔌  DB connection closed.');
  }
}

run();
