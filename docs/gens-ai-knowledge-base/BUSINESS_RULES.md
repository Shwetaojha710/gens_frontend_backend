# GENS.Ai HRMS — Business Rules (as implemented)

> Every rule below was read from the code in `e:\gens_frontend_backend\backend` unless marked otherwise. Nothing here is aspirational: where the code does **not** establish a rule, it is marked **UNKNOWN** or **NOT_FOUND**. Source paths are relative to `backend/app/` unless they start with `frontend/`.
> Companion docs: `COMPLETE_MODULE_CATALOG.md` (what exists), `DATABASE_SCHEMA.md` (tables/columns), `API_CATALOG.md` (endpoints), `AUTHENTICATION_AND_SECURITY.md`, `USER_ROLES_AND_PERMISSIONS.md`.

Status labels: **IMPLEMENTED**, **PARTIALLY_IMPLEMENTED**, **DOCUMENTED_ONLY**, **NOT_FOUND**, **UNKNOWN**, **NEEDS_VERIFICATION**.

## 0. How to read this document

* **Units.** Time-of-day comparisons are in **minutes**; `attendanceSettings.halfdayToAbsentMin` is in **hours** despite its name; `attendanceSettings.lateAllowanceMin` is a **count of days** despite its name (see R-ATT-03). Money is in the tenant currency (no multi-currency conversion exists). Dates are `YYYY-MM-DD`, time zone **Asia/Kolkata** (`connection.js` also pins the DB session to `+05:30`).
* **Where rules live.** Most rules are in controllers (`controller/tenant/*.js`, `controller/recruitment/*.js`) and helpers (`helper/helper.js`, `helper/weekOff.js`, `helper/attendancePunch.js`, `helper/expense.js`, `helper/assets.js`, `helper/performance.js`, `helper/projectTime.js`). The Angular frontend adds UI-only rules (permissions, form validation) that the API does **not** re-check.
* **Live vs backup code.** `routes/app_6_10_2026.js` is mounted by `server.js` but shadowed by `routes/app.js` (the same URL registered later never runs); `controller/tenant/appApi_10_6_2026.js` is not imported anywhere. **Both backups are outdated duplicates — ignore them.** `controller/tenant/salary.js` contains several large commented-out legacy copies of `calculateAttendance`; only the live (uncommented) one is described here.
* **Response envelope.** `Helper.response(status, message, data, res, code)`. Many *business* failures return **HTTP 200 with `status:false`** (so clients must read `status`, not the HTTP code). Most "read" endpoints are `POST`.

---

## 1. Cross-cutting rules

### R-X-01 Tenant and branch scoping — IMPLEMENTED (manual) / risky
* Meaning: every business query is supposed to filter on `tenantId` (and usually `branchId`).
* Inputs: `req.users.tenantId` from the JWT-resolved user row; `branchId` from `req.users.branchId`, which for the web `Admin` guard is taken from the **request header `branchid`** and is **not validated** against the user's branches (`middleware/auth.js`).
* Exceptions/gaps: some lookups use only `id` (+`branchId`) without `tenantId` — e.g. `updatedApplyLeaveStatus` (`controller/tenant/leave.js` ~1680), `revertSalary` (`salary.js`, bill delete by `id`/`bill_id`), `generateDummyAttendance` (no guard at all). Cross-tenant access through a guessed UUID is therefore possible on those endpoints (NEEDS_VERIFICATION per endpoint).

### R-X-02 Server-side authorisation — PARTIALLY_IMPLEMENTED
* The `Admin` guard accepts roles `admin | hr | superadmin | employee` for web tokens (users table) — i.e. **any logged-in `users` row passes** unless the controller checks the role itself.
* Controllers that **do** re-check the role: expense HR endpoints (`controller/tenant/expense.js`, `HR_ROLES = ['admin','hr','superadmin']`), asset HR endpoints (`asset.js`), performance HR endpoints (`performance.js`), project HR endpoints (`project.js`).
* Everything else (employees, payroll, attendance admin, leave admin, masters, reports, settings) relies on the **frontend** permission matrix (`frontend/src/app/services/permission.service.ts`, matrix version `v10`, stored in `localStorage` key `app_role_permissions`, plus per-user overrides from `user_permissions`). The frontend `can()` returns **true for an unknown key**. Enforcement of those modules is therefore **client-side only** (NEEDS_VERIFICATION whether non-admin `users` rows exist in practice — roles `manager/director/recruiter` are *employee-table* roles, not values of `users.role`).

### R-X-03 Audit trail — PARTIALLY_IMPLEMENTED
`helper/auditLog.js → writeAudit()` inserts into table `log` (never throws). Action types found: `EMP_CREATE/UPDATE/DELETE`, `ATTENDANCE_*`, `HOLIDAY_*`, `ATTENDANCE_SETTING_*`, `LEAVE_*`, `LEAVE_TYPE_*`, `LEAVE_ASSIGN_*`, `COMP_OFF_CREATE/APPROVE`, `SALARY_GENERATE`, `SALARY_REVERT`, `SALARY_COMPONENT_*`, `APPRAISAL_APPLY/UPDATE`, `ARREAR_CREATE/UPDATE/SUBMIT/APPROVE/REJECT`, `REIMBURSEMENT_*`, `EXPENSE_CLAIM_SUBMIT/DECISION/PAID`, `PERFORMANCE_*`, `PROJECT_CREATE`, `TIMESHEET_SUBMIT/DECISION`, `ASSET_REGISTER/ALLOCATE`, `RELIEVING_LETTER_ASSET_OVERRIDE`, `LETTER_CREATE/UPDATE`, `DOCUMENT_TEMPLATE_*`, `BRANCH_*`, `DEPARTMENT_*`, `DESIGNATION_*`, `EMPLOYMENT_TYPE_*`, `HOLIDAY_TYPE_*`, `SALARY_ORDER_CREATE`, `PREFIX_*`, `CURRENCY_*`, `DOCUMENT_TYPE_*`, `BRAND_COLORS_UPDATE`, `LETTERHEAD_UPLOAD`, `HANDBOOK_UPLOAD`, `INSURANCE_POLICY_UPLOAD`, `COMPANY_LOGO_*`, `COMPANY_PROFILE_UPDATE`, `USER_PERMISSION_DELETE`, `EMP_PORTAL_OTP_SENT/LOGIN_OK`, `SUPERADMIN_TENANT_UPDATE`.
Not audited (no `writeAudit` found): shifts, week-off roster, AI-face enrolment/camera changes, bank accounts, employee documents, work experience, leave **balance** changes made by payroll (only the salary event is logged), location tracking, recruitment actions, asset return/maintenance (events go to `as_events` instead). Audit failures are swallowed by design.

### R-X-04 Time and "today" — IMPLEMENTED, with inconsistencies
Helpers use `moment-timezone` `Asia/Kolkata`. **Exception:** `AppmarkAttendance` (`controller/tenant/appApi.js` ~6358) builds `datetime` from server local time but derives `date` via `toISOString()` (UTC) → a punch between 00:00 and 05:30 IST can be stored under the **previous calendar date** (NEEDS_VERIFICATION of server TZ).

---

## 2. Authentication and onboarding rules

| ID | Rule | Source | Status |
|---|---|---|---|
| R-AUTH-01 | **Admin/HR web login** needs `email` + `password` + `tenantId` (the company code, not the UUID). Tenant must exist and be `active`. Password compared as **SHA-256 hex** (`crypto-js`). | `controller/auth/login.js` | IMPLEMENTED |
| R-AUTH-02 | Login issues `token` (JWT **8 h**) and `webcamtoken` (JWT **30 d**), both **stored on the `users` row** → single active session per user; a new login invalidates the previous token. | `login.js`, `middleware/auth.js` | IMPLEMENTED |
| R-AUTH-03 | Login response carries tenant info, branch list, currency, `customPermissions` (rows from `user_permissions`) and logo URLs. | `login.js` | IMPLEMENTED |
| R-AUTH-04 | **Mobile app login**: employee mobile → 4-digit OTP by SMS, valid **5 minutes**; only `empPersonals.emp_status = 'approved'` may log in (pending users get a "pending approval" message). | `login.js` (`Applogin`, `verifyOtp`) | IMPLEMENTED |
| R-AUTH-05 | **Hard-coded test credentials**: mobile `8687651183` always receives OTP `6669` (no SMS); the employee-portal path has the same `6669` branch (`employeePortal.js` ~67); interviewer login (`interViewerlogin`) uses a **fixed OTP `1234`** and sends it by SMS. | `login.js`, `employeePortal.js` | IMPLEMENTED (security risk) |
| R-AUTH-06 | Mobile JWT payload `{id}` is signed **without `expiresIn`** → never expires until logout (token also stored in `empPersonals.token`). `Applogout` with `source=web` clears only `webToken`; otherwise clears `token` and `deviceToken`. | `login.js`, `middleware/auth.js` (`AppAdmin`) | IMPLEMENTED |
| R-AUTH-07 | **`POST /api/update-password` is public**: given email + new password + company code it **sets the password and returns a token** with no OTP/old-password check. Treat as an account-takeover hole. | `routes/web.js`, `controller/auth/login.js` | IMPLEMENTED (defect) |
| R-AUTH-08 | **Company self-registration** (`POST /api/company-register`): requires `tenantId` (company code), `email`, `password`, `tenantName`; rejects an existing company code (409) or an email already in `users` (409); in one transaction creates a `tenants` row (`plan: 'basic'`) and one `users` row with `role: 'admin'`. **No subscription row, no branch, no prefix, no attendance settings, no payment verification** is created. | `controller/auth/register.js` | IMPLEMENTED |
| R-AUTH-09 | **Public paid-plan registration**: `/public/plan/:planId` returns safe plan fields; `/public/razorpay/subscription-start` creates a Razorpay customer + subscription (`total_count` 10 for yearly, 1 for one-time, 60 otherwise) and returns the checkout key. **No Razorpay webhook or signature verification exists in the backend** (grep for `webhook|razorpay_signature|validatePaymentVerification` → none), so a completed payment is never confirmed or tied to a tenant server-side. | `controller/publicPayment.js`, `lib/planPayment.js` | PARTIALLY_IMPLEMENTED |
| R-AUTH-10 | **Super admin**: logs in against the system tenant (`SYSTEM_TENANT_CODE`) with role `superadmin`; has forgot-password / reset-password endpoints that use a signed reset token (delivery channel NEEDS_VERIFICATION). Can create/edit plans, activate/deactivate tenants, upsert subscriptions (`startsAt`, `endsAt` mandatory; `seats` empty ⇒ unlimited), list users, view analytics (subscriptions expiring within 30 days) and a tenant snapshot. | `controller/superadmin/superadmin.js` | IMPLEMENTED |
| R-AUTH-11 | **Interview panel users** authenticate via `PanelUser` guard (`middleware/panelAuth.js`, table `interview_panel_users`, role `panel_user`). | `middleware/panelAuth.js`, `controller/recruitment/interview.js` | IMPLEMENTED |
| R-AUTH-12 | CORS reflects **any origin with credentials**; body limit 100 MB. | `server.js` | IMPLEMENTED |

---

## 3. Employee lifecycle rules (`controller/tenant/empPersonal.js`)

| ID | Rule | Notes / source | Status |
|---|---|---|---|
| R-EMP-01 | **Seat limit**: on `createEmp`, count `empPersonals` with `status='active'` for the tenant and compare to the active subscription's `seats` (only if `seats` is not null and `endsAt >= now`). Reaching the limit blocks creation. **A tenant with no subscription row has no limit** (see R-AUTH-08). | `empPersonal.js` createEmp | IMPLEMENTED |
| R-EMP-02 | **Employee code** is auto-generated from the *active* `prefixes` row for tenant+branch: `prefix` + zero-padded number, **minimum 4 digits**, number = tenant-wide max+1, up to **20 retries**; if no prefix exists creation fails. Duplicate `empCode` in the tenant is rejected. | createEmp | IMPLEMENTED |
| R-EMP-03 | **Duplicates**: same mobile or e-mail inside the branch is rejected (rejected employees are ignored). A *pending self-registration* with the same mobile/e-mail → HTTP 409. | createEmp | IMPLEMENTED |
| R-EMP-04 | HR-created employees are saved with `emp_status = 'approved'`; self-registered ones (`RegisterAppEmp`, public) start `pending` and are approved/rejected via `updateEmp` or `approveAllPendingEmp`. Approval generates an `empCode` if blank and again rejects branch-level mobile duplicates. | createEmp, `RegisterAppEmp` | IMPLEMENTED |
| R-EMP-05 | `dateOfBirth` is parsed from a `dd/mm/yyyy` string. | createEmp | IMPLEMENTED |
| R-EMP-06 | **Multi-branch**: `branchIds` (JSONB) grants an employee/manager/director access to several branches; `assign-branches` edits it. Mobile "team" queries branch on this (`controller/tenant/appApi.js` ~520–560, ~2086–2126). | `empPersonal.js`, `appApi.js` | IMPLEMENTED |
| R-EMP-07 | **Status model**: `status` `active|inactive` (default active) and `emp_status` `pending|approved|rejected`. `exitDate` marks leaving; payroll treats days **after** `exitDate` as absent ("Left Employee") — R-PAY-05. There is **no formal offboarding workflow** beyond: the asset-clearance check that blocks the relieving letter (R-AST-08) and the `relieving` letter type. | models, `salary.js`, `letter_data.js` | PARTIALLY_IMPLEMENTED |
| R-EMP-08 | **Delete is a hard delete** with manual, **non-transactional** removal of attendance, bill, bill_info, leave_application, Basic, Allowance, bankAccnt, document and leave_balance rows. It does **not** remove deductions, comp-off, asset allocations, `pm_*`, `pt_*`, expense, AI-face and location rows (orphans). Audit `EMP_DELETE` is written. | `empPersonal.js` ~1416 | IMPLEMENTED (risky) |
| R-EMP-09 | **Recruitment → employee conversion** (hire → create employee): **NOT_FOUND** — recruitment controllers never reference `empPersonal`. HR re-keys the person. | grep `controller/recruitment` | NOT_FOUND |
| R-EMP-10 | **Employment type**: `employmentTypes.duration_type` `full_paid|half_paid`; `half_paid` halves the CTC used for payroll (R-PAY-04). | model, `salary.js` | IMPLEMENTED |
| R-EMP-11 | **Contractual employees**: `isContractual` + `hourlyRate`; contractual attendance days go through `contractual_day_approvals` (R-ATT-12). Payroll does **not** use `hourlyRate` or these approvals (grep shows only `attendance.js` and the model use them). | `attendance.js` ~4469–4590 | PARTIALLY_IMPLEMENTED |
| R-EMP-12 | Employee insurance document types: `e_insurance_card`, `insurance_policy` only. | model | IMPLEMENTED |

---

## 4. Attendance, shift, week-off, late, holiday

### R-ATT-01 Punch recording (`helper/attendancePunch.js → recordAttendancePunch`) — IMPLEMENTED
* Shared by the HR UI, the employee portal and the AI-face service.
* Requires `tenantId, branchId, datetime, ip_address`. One `attendances` row per (employee, date, tenant, branch).
* **First punch of the day = check-in; every later punch overwrites check-out with the latest time.** An `exit` event as the first punch creates a row with in = out = now. There is no minimum interval, no duplicate-punch guard here, and no geofence/shift check in this helper.

### R-ATT-02 Mobile punch (`AppmarkAttendance`, `appApi.js` ~6358) — IMPLEMENTED
* Allowed only if `empPersonals.isofflineAtt` is true, else HTTP 403.
* **Geofence**: if the branch has `range > 0` and coordinates, and the employee is **not** `isLocation`, the distance (haversine, metres) must be within `range`; otherwise allowed (`branchRangeError`).
* `isofflineAllTimeAtt` shift-window validation is **commented out** (not enforced).
* First call = check-in, subsequent = check-out (overwrite).

### R-ATT-03 Attendance settings — IMPLEMENTED
Per tenant + branch row in `attendanceSettings` (defaults in brackets):
| Field | Real meaning | Unit |
|---|---|---|
| `graceMinutes` [15] | minutes after shift start before a check-in is *late* | minutes |
| `lateAllowanceMin` [3] | **number of late days per month** still paid as full days | days (count) |
| `halfDayThreshold` [45] | minutes after shift start beyond which the day becomes a **half day** | minutes |
| `halfdayToAbsentMin` [4] | minimum **hours worked**; below it the day is **absent** | hours |

Inconsistency: `attendanceMaster` (create) reads body field `lateToHalfdayMin` and writes it to `halfDayThreshold`, whereas `updateAttendanceSettings` reads `halfDayThreshold` — clients must send different field names for create vs update (`controller/tenant/attendance.js` ~60–180).
**Missing-settings behaviour:** `calculateAttendance` (payroll) has **no null check**; if a tenant+branch has no `attendanceSettings` row the payroll calculation throws and returns HTTP 500.

### R-ATT-04 Shift — IMPLEMENTED (`controller/tenant/shift.js`, `models/shift.js`)
* One `shifts` row per **shift name per weekday** (`shift` ∈ Day|Night|Afternoon|General; `day_of_week`; `startTime`; `endTime`; `is_week_off`).
* `workingHours = endTime − startTime` (0 if the row is a week-off). Overnight handling is done at payroll time (`shiftEnd += 1 day`, R-PAY-06); how `shift.js` computes `workingHours` for an overnight shift is NEEDS_VERIFICATION.
* A shift **name** that already exists is rejected ("Shift with this name already exists").
* Employees reference a shift by **name** in `empPersonals.shift_id` (VARCHAR(10)), not by id. Renaming/deleting a shift silently breaks that link (NEEDS_VERIFICATION of deletion guard).
* `POST /generateDummyAttendance` exists **without any auth guard** (`routes/shift.js`) — see `AUTHENTICATION_AND_SECURITY.md`.

### R-ATT-05 Week-off resolution (`helper/weekOff.js`) — IMPLEMENTED
Priority, highest first:
1. `employee_week_off_roster` row for (employee, date): `WO` ⇒ week off; `WORKING` ⇒ working day (the working-day timing of the employee's shift is cloned by `effectiveShiftRow` when the shift says week-off for that weekday).
2. `empPersonals.week_off_days` (JSONB of weekday names, e.g. `["Tuesday"]`).
3. `shifts.is_week_off` for that weekday of the employee's shift.
`loadRosterMap` never throws — if the roster table is missing it returns an empty map. Roster maintenance: `routes/weekOff.js` (`/weekoff/roster/list|save|delete|upload`).

### R-ATT-06 `Helper.getWorkingDays(year, month)` — INCONSISTENT
Hard-codes **Saturday and Sunday as non-working** and is used **only** by the dashboard (`controller/tenant/dashboard.js:657`). It ignores the week-off resolver (R-ATT-05), so dashboard "working days"/percentages disagree with payroll for tenants that use other week-offs. Payroll never calls it.

### R-ATT-07 Late attendance report (`getLateAttendance`) — IMPLEMENTED
late minutes = check-in − (shift start + `graceMinutes`); week-off days (via the resolver) are skipped.

### R-ATT-08 Holidays — IMPLEMENTED (`controller/tenant/attendance.js`)
`holidays` per tenant/branch (`holiday_name`, `date`, `holiday_type` string, `status`). A holiday with a `HolidayTypes` name matching `%restricted%` is a **Restricted Holiday (RH)**: it is *not* a free day; it is only usable via an RH leave (R-LV-04). A non-restricted active holiday counts as a **full paid day** in payroll when there is no punch (R-PAY-06). `holidays.status` may be NULL — treated as active in `projectTime.js`.

### R-ATT-09 Regularisation — IMPLEMENTED (`appApi.js`, `models/attendance_regularization.js`)
Employee requests a corrected in/out for a date (`create-regularization`); approvers (`Admin`) approve/reject (`update-status`). The row stores `originalCheckIn/Out` and `wasNewAttendance` so the original can be restored. Audit `REGULARIZATION_STATUS_UPDATE`. The approval policy (who may approve beyond the `Admin` guard) is **UNKNOWN**.

### R-ATT-10 Bulk upload / manual edit — IMPLEMENTED
`upload-attendance` can write the literal strings `WEEK_OFF`/`WO` into `check_in_time`; payroll excludes those markers from "real punches". Manual add/update/bulk-update/delete write `ATTENDANCE_CREATE/UPDATE/DELETE` audits.

### R-ATT-11 Comp-off earning from weekend work — IMPLEMENTED (see R-LV-08..R-LV-11).

### R-ATT-12 Contractual day approval — PARTIALLY_IMPLEMENTED
`contractual-attendance-list/approve/employees` (`attendance.js` ~4469–4590): `requiredHours` = shift `workingHours` (default 8), `totalHours` from punches; approver sets `approved|rejected`. **No payroll effect found.**

### R-ATT-13 AI face attendance — IMPLEMENTED (backend side only)
* Enrolment (`enrollEmployee`): the backend sends images to an external service (`AI_FACE_SERVICE_URL`, default `http://127.0.0.1:8090`) with header `X-AI-Service-Key`; each returned embedding is checked against existing embeddings with `matchThreshold` and stored as `BYTEA` in `ai_face_embeddings`; rejects are reported.
* Config per tenant+branch (`ai_processing_config`): `matchThreshold` 0.48, `minFaceSize` 35, `targetFps` 2.5, `dedupeSeconds` 30, `detWidth/detHeight` 640, `modelName` `buffalo_l`, `retentionDays` 90. `getOrCreateConfig` **silently rewrites** older stricter values (`matchThreshold ≥ 0.55` → 0.48, `minFaceSize ≥ 60` → 35, `targetFps ≤ 1.5` → 2.5, `dedupeSeconds ≥ 120` → 30).
* Camera RTSP URLs are stored **encrypted** (AES-256-GCM, `helper/aiFaceCrypto.js`; key from `AI_FACE_SECRET` / `SECRET_KEY`, else a **hard-coded dev secret**).
* **Internal punch** (`POST /ai-face/internal/punch`, `/internal/unknown`) is protected only by header `x-ai-service-key` equal to `AI_FACE_SERVICE_KEY` — **default `dev-ai-face-key`** when the env var is missing; one shared key for all tenants. A punch calls `recordAttendancePunch` (R-ATT-01) **always** (so check-out keeps moving) and logs to `ai_recognition_logs`; within `dedupeSeconds` of a prior matched/written log for the same employee+event the log row is `duplicate_skipped` but attendance is still updated.
* The recognition service itself (Python/InsightFace) is **NOT_FOUND** in this repository. Tables are created by `scripts/create-ai-face-tables.js`, not by `server.js`.

### R-ATT-14 Location tracking — IMPLEMENTED (`controller/tenant/tracking.js`, `models/deviceLocationLog.js`)
* Employees flagged `isLocation` post GPS points (`track-location`, supports offline bulk batches when `network_mode == 'offline'`; points without lat/lng are skipped).
* **Pinned visit rule:** a point becomes `location_type = 'pinned'` (inheriting `visit_place`/`purpose`) when it is within **50 m** of the employee's most recent pinned point **and** no pinned point with the same place+purpose exists in the **last 1 hour**; otherwise it stays `normal`. Address is resolved through a reverse-geocode helper (`Helper.getAddressFromGlobalVTS`).
* The DBML tables `tracking_sessions/points/task_updates` are DOCUMENTED_ONLY; no such models exist.

---

## 5. Leave rules (`controller/tenant/leave.js`, `appApi.js`, `helper/helper.js`)

| ID | Rule | Source | Status |
|---|---|---|---|
| R-LV-01 | **Leave master**: `leaveName`, `leaveCode`, `isPaid`, `allowedPerYear`, `carryForward`, `maxCarryForward`, `enCashable`, `genderRestriction` (`male|female|all`), `requiresApproval`, `applyBeforeDays`. Of these, payroll/apply logic actually uses **`genderRestriction`, `requiresApproval`, `applyBeforeDays`** and the *name/code* of the type. **`isPaid`, `enCashable`, `maxCarryForward`, `allowedPerYear`, `carryForward` are stored but not used in any calculation** (`allowedPerYear` is only displayed in the app, `appApi.js` ~2844–3000). | `leave.js`, grep | PARTIALLY_IMPLEMENTED |
| R-LV-02 | **Assign balance** (`assignLeave`): needs employee, type, year, month, `totalAssigned`; one row per (employee, type, year, month, branch) — a second one returns "Already Data Exists". `remainingLeaves = totalAssigned + carryForwarded − usedLeaves`. Balances are **monthly rows**. | `leave.js` ~200–365 | IMPLEMENTED |
| R-LV-03 | **Apply checks** (web `applyForLeave` ~801, mobile `AppapplyForLeave` ~3322): leave type must exist in the tenant+branch; `genderRestriction` is compared with `empPersonal.gender`; `applyBeforeDays`: start date ≥ today + N days; duplicate-range check (ignores `self_declined`). **There is no balance check at apply time** (except comp-off in the mobile path — R-LV-10). The mobile API takes `employeeId` from the **request body**, not from the token. | `leave.js`, `appApi.js` | IMPLEMENTED |
| R-LV-04 | **Restricted leave (RH)**: leave code starts with `rh` or name contains "restricted"; `fromDate` must be an active holiday whose holiday-type name matches `%restricted%`. | `leave.js`, `appApi.js` | IMPLEMENTED |
| R-LV-05 | **Initial status**: `requiresApproval === false` ⇒ `approved` immediately; otherwise `pending`. | apply functions | IMPLEMENTED |
| R-LV-06 | **Days**: inclusive date difference; −0.5 for each half-day boundary (`duration_type` / `to_duration_type` ∈ `full|first_half|second_half|short_leave`); a single full day = 1, a single half = 0.5. The **web** version splits a range spanning two calendar months into **two** `leave_applications` rows; the **mobile** version does not split. `short_leave` is accepted by the enum but its day value/handling is NEEDS_VERIFICATION. | `leave.js`, `appApi.js` | PARTIALLY_IMPLEMENTED |
| R-LV-07 | **Status transitions** (`updatedApplyLeaveStatus`, `leave.js` ~1680): sets `status` and stamps `approverId` (approved), `canceledId` (rejected), `recommendedId` (recommended). No transition validation (any state → any state), the lookup uses `id`+`branchId` only (no tenant filter, no null check), and **no balance is changed here**. The `escalate` status exists in the enum; escalation behaviour is NEEDS_VERIFICATION. Manager-only restrictions are commented out. | `leave.js` | IMPLEMENTED (loose) |
| R-LV-08 | **Balance is consumed only when payroll is generated** (R-PAY-10), not on approval. | `salary.js` | IMPLEMENTED |
| R-LV-09 | **Comp-off earning (HR)** `generateCompOffLeave` (~1809): requires a leave master with `leaveCode = "002"`; for a weekend-attendance day creates a `comp_off` row (1 day, **60-day** expiry), adds +1 to `leave_balances` for the 002 type and sets `attendances.is_comp_off_approve = true`. `approveCompOffLeave` sets `approval_status = approved` and adds +1 to the 002 balance (skipped if already approved). | `leave.js` ~1809–2100 | IMPLEMENTED |
| R-LV-10 | **Manual comp-off** (`CreateManuallyCompoff`, `attendance.js` ~4229): past dates only; supports "All" employees; expiry = **+3 months**; `approval_status = pending`; duplicate (employee, date) rejected. Model default for `comp_off.approval_status` is **`"approved"`**, so rows created elsewhere without the field are born approved. | `attendance.js`, `models/comp_off.js` | IMPLEMENTED |
| R-LV-11 | **Using comp-off** (mobile apply, `appApi.js` ~3555–3570): requires `comp_off.approval_status = approved` and `remainingDays ≥ days`; **decrements `usedDays`/`remainingDays` at apply time**; the expiry check is **commented out**. Payroll then decrements **again** for approved comp-off leaves (R-PAY-10) → **double-deduction risk** (see §12 #1). | `appApi.js`, `salary.js` | IMPLEMENTED (defect risk) |
| R-LV-12 | **Carry-forward**: only the **name-based CL rule** exists (R-PAY-11). Generic `carryForward/maxCarryForward` flags are not applied. | `salary.js` | PARTIALLY_IMPLEMENTED |
| R-LV-13 | **Leave ledger**: `get-leave-ledger` is derived on the fly; `models/leaveLedger.js` is an **empty 0-byte file**. | `leave.js` | IMPLEMENTED (derived) |
| R-LV-14 | **Balance adjustment at payroll** (`Helper.adjustLeaveRecords`, `helper.js` ~535): an *approved* leave longer than `remainingLeaves` is split into an approved part and an **unpaid (LOP) remainder**; *non-approved* leave is always treated as unpaid. Comp-off leaves (`compOffId` set) are checked against the `comp_off` record (status `used|active`) instead of `leave_balances`. | `helper.js` | IMPLEMENTED |

---

## 6. Payroll rules (`controller/tenant/salary.js`, `basic.js`, `appraisal.js`, `arrear.js`, `helper/helper.js`)

### R-PAY-01 Salary structure — IMPLEMENTED
Annual CTC and heads live in `Basics` (`dependent='CTC'`), `allowances`, `deductions`, each versioned with `startDate`/`endDate`/`status`. Components come from `master_components` (`value_type` `fixed|percentage|basic_dependent|is_special`; `component_type` `payable|deductible|reimbursable`). `setup-salary` / `updateSalarySetUp` / `createVariable` maintain them.

### R-PAY-02 Statutory payroll — NOT_FOUND
No PF, ESI, professional tax, TDS/income-tax, gratuity or bonus-act logic exists in code (searches for these terms in `salary.js`/helpers return nothing relevant). The earlier Feature Analysis PDF (`docs/GENS_Feature_Analysis.pdf`) is the documented source of that gap (DOCUMENTED_ONLY). Any deduction beyond leave/penalty must be a manually created deduction component.

### R-PAY-03 Eligibility for a payroll run — IMPLEMENTED
`calculateAttendance` skips employees **without an active `Basic` CTC row**, employees **already billed** for that month, and employees **without any real punch** that month. (Employees with only approved leave and no punch are therefore excluded — NEEDS_VERIFICATION whether that is intended.)

### R-PAY-04 Per-day rate — IMPLEMENTED
`perDay = (annualCTC / 12) / calendarDaysInMonth` (28–31). For `half_paid` employment types the CTC is **halved** first. Result rounded in later steps.

### R-PAY-05 Employment window — IMPLEMENTED
Start = `joiningDate` if it falls in the month (earlier days are not counted). Days after `exitDate` count as absent ("Left Employee").

### R-PAY-06 Day classification (live `calculateAttendance`, `salary.js` ~4998–6380) — IMPLEMENTED
Shift is resolved with `WeekOff.effectiveShiftRow` (R-ATT-05). For each day in the employment window, in this order:
1. **Week-off / no shift row** ⇒ counts as a **full day**, *unless* it is sandwiched by unpaid leave (R-PAY-07 → absent/LOP). Approved leave on a week-off counts as full/half per the leave.
2. **No punch / incomplete punch**: approved leave ⇒ full/half; unpaid, pending, rejected, recommended or self-declined leave ⇒ **LOP absent**; non-restricted holiday ⇒ **full day**; otherwise **absent**.
3. **workedHours < `halfdayToAbsentMin`** (hours) ⇒ absent (approved leave overrides).
4. **check-in later than shiftStart + `halfDayThreshold` minutes** ⇒ half day (approved leave overrides).
5. **check-in later than shiftStart + `graceMinutes`** ⇒ a **late** day: while the running late count `< lateAllowanceMin` it still counts as a **full day**; beyond that it counts as a **half day**.
6. On-time check-in but **check-out before shift end** ⇒ half day (unless approved leave).
7. Otherwise ⇒ full day.
Overnight shifts: `shiftEnd += 1 day`.

### R-PAY-07 Sandwich rule (`Helper.applySandwichRule`, `helper.js` ~168) — IMPLEMENTED
Non-working days (holidays + shift/employee week-offs) that lie **between two leave records** (or a leave and an absent anchor) become sandwiched leave: **approved only if both neighbours are approved**; an absent-anchor neighbour makes it **unpaid**. Restricted-holiday leaves are not sandwiched (they act as anchors only when applied). The client can toggle `applysandwitchleave` per employee (R-PAY-09).

### R-PAY-08 Earned units and LOP — IMPLEMENTED
`earnedUnits = fullDays + 0.5 × halfDays`; `basePay = round(earnedUnits × perDay)`; LOP `totalDeduction = round(max(0, employmentDays − earnedUnits) × perDay)`. The returned `basePay` is `basePay + bonusAmount`, where `bonusAmount` = Σ`finalAmount` of `allowances` of type `is_special` **+** Σ`finalAmount` of `deductions` of type `is_special` (added with `+`; if it was meant to be a net the sign is wrong, and a null sum yields `NaN`) — NEEDS_VERIFICATION.

### R-PAY-09 Generating payslips (`generateSalary`, `salary.js` ~2566–3000) — IMPLEMENTED, **client-trusted**
* Body is an **array supplied by the client** (`emp.basePay`, `emp.components[].pay_amount`, `emp.applysandwitchleave`, `emp.leavebalance`, `emp.fullDays`, …). **The server does not recompute**: `bills.net_amount = emp.basePay`, `bill_infos.amount = comp.pay_amount`. A tampered request can create any payslip amount (see §12 #2).
* One transaction per employee; skipped if a bill already exists for tenant+employee+year+month+branch.
* `bills.bill_id` is an auto-increment unique integer; counters and line amounts are stored as **strings**.
* Writes audit `SALARY_GENERATE`; marks approved arrears for that payout month as **paid** (`markArrearsPaid`).

### R-PAY-10 Leave balance and comp-off consumption at payroll — IMPLEMENTED
* Paid approved leave is added to `leave_balances.usedLeaves`; `remainingLeaves = max(prevRemaining − used, 0)`.
* For comp-off leaves it additionally decrements `comp_off.usedDays/remainingDays` (status → `used` when ≤ 0) **and** updates `leave_balances` for that leave type — on top of the apply-time decrement (R-LV-11).

### R-PAY-11 Casual-leave carry-forward and monthly credit — IMPLEMENTED
For leave types whose name is `cl` or contains `casual`, the next month's `leave_balances` row is created with: carry = previous remaining − CL used; monthly credit = **1** if the employee is within their **first 3 months since the joining month** (`monthsSinceJoining < 3`, measured from joining month to the *next* month), else **2**; with no `joiningDate` the credit is **2**. Stored with `carryForwarded`, `prevremainingLeaves`, `prevusedLeaves`. Other leave types are not carried. **Name-based** — renaming CL breaks it.

### R-PAY-12 Component amounts (`calculateSalaryComponent`, ~1785) — IMPLEMENTED, side-effecting
Normal components: `finalAmount / 12 × typeMultiplier (0.5 for half_paid) × monthFactor (payableDays / daysInMonth)`; `is_special`/deduction types use `finalAmount` unchanged. **The client supplies `totalDeduction` and `penaltyAmount`**, and this "calculate" endpoint **deactivates and re-creates `deductions` rows named "Leave Deduction" and "Penalty" for the month** — a calculation call mutates data.

### R-PAY-13 Revert (`revertSalary`) — IMPLEMENTED, incomplete
Hard-deletes the `bills` + `bill_infos` rows and deletes next month's `leave_balances`, restoring the previous month's used/remaining from `prevusedLeaves/prevremainingLeaves`. Lookup is by `id`/`bill_id` **without a tenant check on the bill**. It does **not** restore `comp_off` usage or un-pay arrears. Audit `SALARY_REVERT`.

### R-PAY-14 Appraisal / increment (`appraisal.js`) — IMPLEMENTED
`previewAppraisal` / `applyAppraisal`: requires `percent ≥ 0` and an `effectiveDate`. `applyIncrement` multiplies each payable head's current amount by `1 + percent/100` (rounded), **unless the head key is in the "closed" list**; deductions are closed (excluded) by default (`resolveClosedKeys`). Applying: sets `endDate = effectiveDate − 1 day` and `status='inactive'` on the old `Basics`/`allowances`/`deductions` rows and inserts new rows starting on `effectiveDate`; stores the previous structure in `employee_old_salary`; refuses an increment whose total increase is 0 while `percent > 0`; audit `APPRAISAL_APPLY`. Applied appraisals can be listed, previewed again and updated (`APPRAISAL_UPDATE`, which re-versions rows).

### R-PAY-15 Arrears (`arrear.js`) — IMPLEMENTED
* Window: from (effectiveYear, effectiveMonth) through the month **before** the implementation month; payout month = implementation month (`getArrearMonths`).
* Per month: `actualPaid` = the bill's net (or the last bill / current structure if none), `revisedSalary` = `actualPaid + monthlyIncrement` when a percentage is used, otherwise computed from the revised structure; `difference = revisedSalary − actualPaid`, and only **positive** differences become `arrearAmount`; |difference| < 1 is treated as 0.
* Workflow `draft → pending (submit) → approved | rejected → paid`; `ARREAR_SUBMIT/APPROVE/REJECT` audited. `paid` is set by payroll generation (R-PAY-09). The branch is required (`requireBranch`).
* How the approved arrear enters the payslip (the `allowanceId` column suggests a payable allowance row) — NEEDS_VERIFICATION in detail.

### R-PAY-16 Reports — IMPLEMENTED (`controller/tenant/report.js`)
`employee-report`, `payroll-report`, `salary-register-report` only (3 endpoints). Late and tracking "reports" are served by attendance/tracking controllers; frontend keys `rep.late`, `rep.tracking` map to those.

### R-PAY-17 Salary slip / salary docs — PARTIALLY_IMPLEMENTED
`SubmitSalaryDoc` / `salarydocs`, `getBillDetails` and PDF generation exist; the template/layout rules are UNKNOWN (not traced).

---

## 7. Reimbursement and expense rules (`helper/expense.js`, `controller/tenant/expense.js`, `expensePortal.js`, `attendance.js`, `appApi.js`)

### R-RMB-01 Legacy reimbursement — IMPLEMENTED
Header row in `reimbursements` (INTEGER `amount`, `status` default `pending`, `employeeId` NOT NULL) + `reimbursement_files`. Admin variants live in `attendance.js` (`add-reimbursement`, `fetchReimbursement`, `update-reimbursement`, `update-reimbursement-status`, `delete-reimbursement`), mobile variants in `appApi.js` (`add-app-reimbursement`, `reimbursement-list`, `team-reimbursements`, `update-app-reimbursement-status`). A `kind = legacy` claim is a **single-step HR decision** from `pending/recommended` to `approved/rejected` (and `paid`). Audits `REIMBURSEMENT_*`.

### R-EXP-01 Claim structure — IMPLEMENTED
A claim = a `reimbursements` header (status lives here) + `expense_claims` (workflow data) + `expense_items` + receipts (also mirrored into `reimbursement_files`). Header amount = `Math.round(total)` (INTEGER) while `claimedAmount` is DECIMAL.

### R-EXP-02 Approval levels and rule resolution — IMPLEMENTED
* Level types, in this order of availability: `manager`, `skip_manager`, `hr`, `finance`. Defaults `["manager","finance"]` (`expense_settings.defaultLevels`); `financeEmployeeIds` lists finance approvers; `flaggedRequiresHr` default **true**; `claimPrefix` default `EXP`.
* Rule matching (`expense_approval_rules`): category-specific rules are tested against the **category subtotal**, generic rules against the **claim total**; `minAmount ≤ amount ≤ maxAmount`; highest `priority` wins, category-specific wins ties; the levels of all matching categories are **merged**; any flagged item adds `hr` when `flaggedRequiresHr`.
* Levels with no applicable approver (no manager, or the manager is the claimant) are **skipped**; if every level is skipped the claim is **auto-approved**.

### R-EXP-03 Submission validation — IMPLEMENTED
Category active; amount > 0; date valid and **not in the future**; the receipt belongs to the employee, is unused and not already claimed. Receipt required when `amount > receiptRequiredAbove`. Category limits `perClaimLimit`, `maxAgeDays`, `monthlyLimit`: breach is an **error** when `limitAction = 'block'`, otherwise a **flag**. Duplicate signals: same **receipt file hash** already claimed ⇒ error; same category+date+amount ⇒ flag `possible_duplicate`; same invoice number for the same merchant ⇒ flag `duplicate_invoice`. OCR (Tesseract) populates `ocrData`; `ocrStatus` ∈ `done|failed|skipped`.

### R-EXP-04 Claim number — IMPLEMENTED
`{claimPrefix}-{YYMM}-{count+1, 4 digits}` per tenant, from a `count` query → **race-prone** (two simultaneous submissions can collide).

### R-EXP-05 Acting on a claim — IMPLEMENTED
* Rejection **requires a comment** and ends the claim.
* Portal (`expensePortal.js`, employee auth): manager/skip-manager level = the specific employee in `reportingPersonId` chain; finance level = employees in `financeEmployeeIds`; the portal **never** acts on `hr`; nobody can approve their own claim.
* HR controller (`expense.js`): roles `admin|hr|superadmin`; may act on `hr` and `finance` levels; acting on a manager level needs `override:true` and is recorded as an "HR override".

### R-EXP-06 Payment — PARTIALLY_IMPLEMENTED
`markPaid` only for `approved` headers; modes `bank_transfer | upi | cash | cheque | payroll`; a reference is mandatory for bank_transfer/upi/cheque; `payroll` mode needs `payrollMonth/payrollYear`; status becomes `paid`; audit `EXPENSE_CLAIM_PAID`. **`salary.js` never reads these fields** (no `payrollMonth|reimburse` reference), so "payroll" mode is only a recorded label — approved claims are **not** added to a payslip automatically.

---

## 8. Timesheet / project rules (`helper/projectTime.js`, `controller/tenant/project.js`, `projectPortal.js`)

| ID | Rule | Status |
|---|---|---|
| R-PRJ-01 | **Project**: `billingType` ∈ `time_material|fixed|non_billable`; `status` ∈ `planned|active|on_hold|completed|cancelled`; defaults for bill/cost rate on the project, overridable per allocation. HR role required for management endpoints. | IMPLEMENTED |
| R-PRJ-02 | **Allocation**: `allocationPercent` integer **1–100**; end ≥ start; rates ≥ 0; an employee can be on a project only once (edit the existing allocation instead); only active employees. | IMPLEMENTED |
| R-PRJ-03 | **Tasks**: title required; `status` `todo|in_progress|done`; estimate ≥ 0; **one level** of subtasks only (a subtask cannot have subtasks, a parent cannot become a subtask, a task cannot be its own parent); assignee must be a project member; a task with logged time cannot be deleted ("mark it done"). | IMPLEMENTED |
| R-PRJ-04 | **Billable**: hours are billable only if project ≠ `non_billable` **and** the allocation `isBillable !== false` **and** the task `isBillable !== false` (and the entry's own flag). | IMPLEMENTED |
| R-PRJ-05 | **Time entry**: date valid and **not in the future (IST)**; hours > 0, **≤ 24**, at most **2 decimals**; project must be `active` and the date inside its start/end; the employee must be **allocated on that date**; the task must belong to the project; the **day total across projects ≤ 24 h**; the week's timesheet must be `draft` or `rejected` (editable). | IMPLEMENTED |
| R-PRJ-06 | **Timer**: only one running timer per employee; stop discards sub-minute runs and **caps the entry so the day stays ≤ 24 h**; an entry with a running timer cannot be edited; a week cannot be submitted while a timer runs. | IMPLEMENTED |
| R-PRJ-07 | **Timesheet** = one row per employee per **ISO week (Monday start)**; states `draft → submitted → approved | rejected`; rejected can be edited and resubmitted. Submit needs `totalHours > 0`; `approverId` = employee's `reportingPersonId`. Rejection needs a reason. Audits `TIMESHEET_SUBMIT/DECISION`. | IMPLEMENTED |
| R-PRJ-08 | **Reports** count entries from `submitted + approved` weeks (or `approved` only when requested) and only entries with no running timer. Utilisation capacity = working days × `pt_settings.hoursPerDay` (default 8; working days default Mon–Fri `[1..5]`). | IMPLEMENTED |
| R-PRJ-09 | **Attendance reconciliation** (read-only) per employee/day flags: `logged_on_leave` (time on a full-day approved leave), `logged_without_attendance`, `over_attendance` (logged > attended + `reconcileToleranceHours`, default 0.5 h), `missing_timesheet` (present on a working day in the past with 0 logged). It uses `pt_settings.workingDays` + holidays, **not** the shift/week-off resolver. Timesheets **never** feed payroll. | IMPLEMENTED |

---

## 9. Asset rules (`helper/assets.js`, `controller/tenant/asset.js`, `assetPortal.js`)

| ID | Rule | Status |
|---|---|---|
| R-AST-01 | **Tag**: `{category.code}-{0001…}` = max existing numeric suffix + 1 per category prefix; tag keeps its original prefix even if the asset moves category; `qrToken` = random 16-byte hex; QR label URL `{base}/layout/assets/scan/{qrToken}`. | IMPLEMENTED |
| R-AST-02 | **Register**: name required; purchase date not in the future; warranty end ≥ purchase date; cost ≥ 0; condition ∈ `new|good|fair|poor|damaged`; **quantity 1–200**; quantity > 1 only for non-serialised items; serial number must be unique per tenant. | IMPLEMENTED |
| R-AST-03 | **Status change** (`setStatus`): only to `available|retired|lost`; blocked while `allocated` (receive back first) or `in_repair` (close maintenance first); `retired`/`lost` need a reason. | IMPLEMENTED |
| R-AST-04 | **Allocate**: asset must be `available`; employee must be active; allocation date not in the future; expected return ≥ allocation date; `ackStatus` starts `pending` unless the category sets `requiresAcknowledgement = false` (`not_required`). | IMPLEMENTED |
| R-AST-05 | **Acknowledge** (employee portal): allocation must be `active`; action `acknowledged|disputed`; a dispute needs a comment; cannot acknowledge twice. | IMPLEMENTED |
| R-AST-06 | **Return**: employee can request a return once; HR `receiveReturn`: return date not in the future and not before allocation; condition required unless lost; recovery amount ≥ 0; lost needs notes. Lost ⇒ asset status `lost`; otherwise asset becomes `available` with the returned condition. Each step writes `as_events`. **`recoveryAmount` is not deducted anywhere in payroll** (no reference in `salary.js`). | IMPLEMENTED / PARTIALLY_IMPLEMENTED |
| R-AST-07 | **Maintenance**: cannot open for `retired|lost` assets; one open record per asset; type `repair|service|upgrade|inspection`; description required; start date not in the future; close: end date between start and today, cost ≥ 0. | IMPLEMENTED |
| R-AST-08 | **Exit clearance**: `clearanceFor(tenant, employee)` lists active allocations; **generating a relieving letter is blocked while assets are pending** (`letter_data.js` ~541–556) unless the request carries `overrideAssetClearance`, in which case an audit `RELIEVING_LETTER_ASSET_OVERRIDE` is written. The `/asset/clearance/override` route records an override. | IMPLEMENTED |
| R-AST-09 | **Warranty state** and dashboard counters (pending acknowledgements, disputed, return requests, overdue returns, expiring warranties, pending clearance) are computed on read. | IMPLEMENTED |

---

## 10. Recruitment rules (`controller/recruitment/job.js`, `candidate.js`, `interview.js`)

| ID | Rule | Status |
|---|---|---|
| R-REC-01 | **Job posting**: `job_requirements.status` default `draft`; `publishJob` creates a public URL `{slug}?job_id=…&token=…` with optional `expires_days` → `expires_at`; `saveJobLink` regenerates it. Skills master via `get-skills` / `skills` table. | IMPLEMENTED |
| R-REC-02 | **Public application** (`submit-application`, no auth): resume file required; job must exist and have status `open` (case-insensitive), else "Applications are closed"; candidate matched by **case-insensitive e-mail** (global, not per tenant) — an existing candidate's profile is **overwritten** with the new form values. | IMPLEMENTED |
| R-REC-03 | **Duplicates**: a different candidate with the **same phone** who already applied to this job ⇒ 409; the same candidate (by e-mail) already applied to this job ⇒ 409. `check-duplicate-application` offers a pre-check by e-mail or phone. | IMPLEMENTED |
| R-REC-04 | On success an `applications` row is created with `stage='candidate_applied'`, `status='submitted'`, `ats_status='queued'`; a confirmation e-mail is sent. | IMPLEMENTED |
| R-REC-05 | **ATS scoring**: after commit the backend calls an **external HTTPS service** (`ATS_EVALUATE_URL`, a hard-coded demo host) with the resume. Success ⇒ `ats_status='completed'`, scores saved in `candidate_ats_scores`, `stage='ats_screening'`, `status='screening'`; failure ⇒ `ats_status='failed'` with scores 0. A local `runAtsScan` / `calculateAtsScore` path also exists in the controller; which one is used in which situation is NEEDS_VERIFICATION (the public submit path calls `runExternalAtsScan`). **Final score = `round((ats_score + manual_score) / 2)`** (manual defaults to 0, so an unreviewed application is halved). The scoring algorithm is inside the external service (UNKNOWN). | IMPLEMENTED (external dependency) |
| R-REC-06 | **Manual ATS update** (`save-ats-score`): recomputes the final score by the same average; `shortlisted=true` ⇒ stage/status `shortlisted`, else `ats_screening/screening`. `update-stage` sets any stage string (no state machine); `shortlisted` stage also sets `shortlisted=true`. | IMPLEMENTED (no transition validation) |
| R-REC-07 | **Edit application** only while `stage == 'candidate_applied'` (else 403). | IMPLEMENTED |
| R-REC-08 | **Interview rounds** are tenant masters (`interview_rounds`, typed by `round_types`, reorderable); a candidate's rounds are scheduled with `save-interview-schedule` (`status` `pending|scheduled|completed|cancelled`); scheduling sets the application stage `interview_scheduled`. An interviewer can be assigned and an e-mail sent (`send-interview-mail`). | IMPLEMENTED |
| R-REC-09 | **Feedback** (`save-interview-feedback`, panel `panel-save-feedback`): stores rating (default 0), `recommendation` (default `hold`), strengths/concerns/notes. A recommendation of **`rejected`** sets the application to `rejected` and stops. Otherwise, after saving, **if every round that has an interviewer has submitted feedback the stage becomes `offered`**; else `interview_in_progress`. It does **not** require the recommendations to be positive — "hold" on the last round still moves to `offered`. | IMPLEMENTED (loose) |
| R-REC-10 | **Offer letter** (`offer_letters`): a standalone record of typed values (name, father name, gender, designation, department, dates, ref no) with generated PDF; fetchable by phone; duplicate check endpoint. Not linked to `applications`, and **no hire → employee step** (R-EMP-09). | IMPLEMENTED (standalone) |
| R-REC-11 | **Panel users** (external interviewers): created by HR, log in with their own credentials (`panel-user-login`), see only `get-my-interviews`, save feedback. Their `password`/`token` are stored in `interview_panel_users`. | IMPLEMENTED |

---

## 11. Performance rules (`helper/performance.js`, `controller/tenant/performance.js`, `performancePortal.js`)

| ID | Rule | Status |
|---|---|---|
| R-PRF-01 | **Cycle** (`pm_cycles`): `cycleType` `quarterly|half_yearly|annual|custom`; deadlines for goal setting / self review / feedback / manager review; status `draft → active (launched) → closed`; `departmentIds` optional scope; `competencies` default list (e.g. Communication, Teamwork, Ownership, Problem Solving, …); `approvalLevels` ⊂ `{skip_manager, hr}` (default `["hr"]`). | IMPLEMENTED |
| R-PRF-02 | **Review lifecycle**: `goal_setting → self_review → manager_review → in_approval → approved`. `lock-goals` moves reviews to `self_review` **only when goal weightages total exactly 100 %**; otherwise the review is skipped with "Goal weightage totals X%, must be 100%". HR may `skip-self` review. | IMPLEMENTED |
| R-PRF-03 | **Goals**: type `okr` (needs ≥ 1 key result, each with title and target) or `kpi` (needs `targetValue`); goal `weightage`; progress can still be updated after goals are locked. | IMPLEMENTED |
| R-PRF-04 | **Achievement %**: KPI = `actual/target × 100` (if `higherIsBetter=false`: `target/actual × 100`, and `actual ≤ 0` ⇒ 120), clamped to **0–120**; KPI with target 0 ⇒ 100 if actual ≥ 0; missing target/actual ⇒ 0. Key result progress = `(current−start)/(target−start) × 100`, clamped 0–120. OKR achievement = weightage-weighted average of key results; review goal achievement = weighted average of goals (plain average when all weights are 0). | IMPLEMENTED |
| R-PRF-05 | **Rating conversion**: goal rating = `clamp(achievement / 20, 1, 5)` (100 % ⇒ 5.0). | IMPLEMENTED |
| R-PRF-06 | **Final rating** = weighted mix of goal / manager / 360-feedback ratings using the cycle weights (**default 50 / 30 / 20**); a missing component is **dropped and the remaining weights re-normalised** (so provisional scores exist before all phases finish). | IMPLEMENTED |
| R-PRF-07 | **Bands**: performance band 3 if rating ≥ 4, 2 if ≥ 3, else 1; potential 1–3 chosen by the manager; **nine-box** label from (band, potential), e.g. (3,3) "Star", (1,1) "Underperformer". Rating label: ≥ 4.5 Outstanding, ≥ 3.75 Exceeds Expectations, ≥ 3 Meets Expectations, ≥ 2 Needs Improvement, else Unsatisfactory. | IMPLEMENTED |
| R-PRF-08 | **Feedback (360)**: reviewers are chosen per review (≥ 1, cannot include the reviewee, must be valid employees); relationship `manager|peer|direct_report`; competency ratings and overall must be **1–5**; reviewer names are hidden from the employee viewing their own review. | IMPLEMENTED |
| R-PRF-09 | **Manager review**: rating must be 1–5 and potential 1/2/3. | IMPLEMENTED |
| R-PRF-10 | **Approval chain**: each level is recorded in `pm_review_approvals`; a **rejection requires comments and sends the review back to `manager_review`** (level reset to 0); approval advances to the next *applicable* level (skip-manager is skipped when none exists); after the last level the review becomes `approved` with `approvedAt`. | IMPLEMENTED |
| R-PRF-11 | **Link to pay**: approved ratings **do not** drive increments; the payroll appraisal (R-PAY-14) is a separate manual percentage process. | NOT_FOUND (no link) |

---

## 12. Documents, letters, notifications, dashboards

| ID | Rule | Status |
|---|---|---|
| R-DOC-01 | **Letters** (`letter_data`): types `nda|appointment|relieving|offer|service`; `save-letter-data`, `get-letter-data`, `get-letter-stats`, `generate-letter-pdf`, `generate-all-letters-pdf`; relieving letter blocked by asset clearance (R-AST-08). Audit `LETTER_CREATE/UPDATE`. | IMPLEMENTED |
| R-DOC-02 | **Document templates** (`document_templates` / `generated_documents`; spec in `docs/hr-document-template-spec.md`): CRUD, variable catalogue (`hr-template-variables`), preview, save-generated, generated-list/get. Syntax/variable list is defined by the controller (not re-traced here — NEEDS_VERIFICATION against the spec). | IMPLEMENTED |
| R-DOC-03 | **Header notifications / FCM**: `header-notifications` + `mark-header-notifications-read` (`notification_reads` stores per-user read state); mobile `notification` + `mark-notifications-read`; leave-apply pushes an FCM message to the reporting manager (`notifyManagerOnLeaveApply`). | IMPLEMENTED |
| R-DOC-04 | **Dashboard** (`dashboard.js`): `getDashboardData` (role-dependent, branches around line 1008), attendance chart, department-wise attendance, team-wise attendance, today's attendance — computed live; working-day counts use the Sat/Sun hard-code (R-ATT-06). | IMPLEMENTED |
| R-DOC-05 | **Audit list** `/audit/list` (`routes/audit.js`) reads `log`. | IMPLEMENTED |
| R-DOC-06 | **Company settings** (`setting.js`, `master.js`): brand colours, logo (light/dark), letterhead, handbook, insurance policy files, company profile, `app-config` (e.g. image quality for mobile photos), per-user permission overrides (`user-permission` save/get/delete → `user_permissions`). | IMPLEMENTED |

---

## 13. Known inconsistencies and defects (cross-reference)

| # | Item | Evidence | Impact |
|---|---|---|---|
| 1 | **Comp-off double deduction**: mobile apply decrements `comp_off.usedDays/remainingDays`; payroll `generateSalary` decrements again for approved comp-off leaves; `revertSalary` restores neither. Expiry check commented out. | `appApi.js` ~3555–3570; `salary.js` generateSalary/revertSalary | Employees can lose comp-off twice; expired comp-off still usable. |
| 2 | **`generateSalary` trusts the client** (`basePay`, `pay_amount`, leave counters, sandwich flag); `calculateSalaryComponent` trusts client `totalDeduction`/`penaltyAmount` and mutates deductions. | `salary.js` | Payslip tampering / divergence from `calculateAttendance`. |
| 3 | **`getWorkingDays` Sat/Sun hard-code** vs week-off resolver. | `helper.js`, `dashboard.js:657`, `helper/weekOff.js` | Dashboard ≠ payroll for non-Sat/Sun week-offs. |
| 4 | Missing `attendanceSettings` ⇒ payroll 500 (no null check). | `salary.js` | New tenants cannot run payroll until settings exist. |
| 5 | `attendanceMaster` vs `updateAttendanceSettings` field-name mismatch (`lateToHalfdayMin` vs `halfDayThreshold`). | `attendance.js` | Settings silently not saved correctly depending on client. |
| 6 | `lateAllowanceMin` is a day-count and `halfdayToAbsentMin` is hours, but names suggest minutes. | `salary.js`, `attendanceSetting` model | Misconfiguration. |
| 7 | Leave balance consumed only at payroll; no balance check when applying/approving; approval has no state validation or tenant check. | `leave.js`, `salary.js` | Over-draw possible; balance screens lag. |
| 8 | Statutory deductions (PF/ESI/PT/TDS) not implemented. | `salary.js` | Compliance gap. |
| 9 | Public `/update-password`; fixed OTPs (`6669`, `1234`); non-expiring mobile JWT; reflective CORS; `dev-ai-face-key` default; hard-coded dev encryption secret; unauthenticated `/generateDummyAttendance`; client-chosen `branchid` header. | `login.js`, `employeePortal.js`, `server.js`, `aiFace.js`, `aiFaceCrypto.js`, `shift.js` | Security. |
| 10 | Hard-delete employee with partial manual cascade and orphans. | `empPersonal.js` | Data integrity. |
| 11 | `AppmarkAttendance` UTC date vs local time. | `appApi.js` ~6358 | Wrong date near midnight IST. |
| 12 | Recruitment: global `candidates` table updated across tenants; `offered` reached without positive recommendation; no hire→employee; ATS via external demo URL. | `candidate.js`, `interview.js` | Privacy / process gaps. |
| 13 | Expense "payroll" payment mode and asset `recoveryAmount` never reach payroll; timesheets never feed payroll; contractual approvals and `hourlyRate` unused. | grep `salary.js` | Manual reconciliation required. |
| 14 | Razorpay: no webhook/signature verification; registration creates no subscription. | `publicPayment.js`, `register.js` | Paid plans are not enforced automatically. |
| 15 | Bill counters and line amounts stored as strings; `bills.net_amount` FLOAT; `reimbursements.amount` INTEGER. | models | Rounding and casting issues. |
| 16 | Duplicate route handlers: `app_6_10_2026.js` mounted but shadowed; `appApi_10_6_2026.js` orphan; `pending-leave-list` is also defined twice in `app.js`. | `server.js`, `routes/` | Confusion; do not edit the backups. |

---

## 14. Rules not established (UNKNOWN / NEEDS_VERIFICATION)

* Who is allowed to approve regularisations and leave beyond the `Admin` guard (server side) — UNKNOWN.
* Behaviour of `short_leave` duration and the `escalate` leave status — NEEDS_VERIFICATION.
* Whether approved arrears become a payslip allowance row and exactly how — NEEDS_VERIFICATION.
* Salary-slip PDF layout rules and document-template variable semantics — NEEDS_VERIFICATION.
* The external ATS scoring algorithm and the external AI-face recognition service — NOT_FOUND in repo.
* Probation/notice-period/confirmation, shift-swap, overtime, loan/advance, F&F settlement, tax declarations — NOT_FOUND (no models or controllers).
* Whether the live database enforces the foreign keys and unique indexes the code assumes — NEEDS_VERIFICATION (see `DATABASE_SCHEMA.md` §10).
