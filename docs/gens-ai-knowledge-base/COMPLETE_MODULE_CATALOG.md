# GENS.Ai HRMS — Complete Module Catalog

> What exists in `e:\gens_frontend_backend` today, module by module, with evidence. Backend = Node/Express 5 + Sequelize 6 + PostgreSQL (`backend/`); Frontend = Angular 19 (`frontend/`). Companion docs in this folder: `BUSINESS_RULES.md` (rules and defects), `DATABASE_SCHEMA.md` (tables/columns/ER), `API_CATALOG.md`, `AUTHENTICATION_AND_SECURITY.md`, `USER_ROLES_AND_PERMISSIONS.md`, `SYSTEM_OVERVIEW.md`.
>
> Status labels: **IMPLEMENTED**, **PARTIALLY_IMPLEMENTED**, **DOCUMENTED_ONLY**, **NOT_FOUND**, **UNKNOWN**, **NEEDS_VERIFICATION**.

## 0. Platform facts that apply to every module

| Topic | Fact | Evidence |
|---|---|---|
| Architecture | Multi-tenant SaaS, shared PostgreSQL schema, `tenantId` UUID column (86 of 99 tables), `branchId` on 62 tables; isolation is manual `where: { tenantId }` — no global scope or RLS. | `DATABASE_SCHEMA.md` §3 |
| Route mounting | `backend/server.js` mounts **every file** in `backend/app/routes` under `/api` using `readdirSync`. 40 route files; ≈ 528 `router.*` declarations excluding the backup `app_6_10_2026.js` (≈ 568 including it; `API_CATALOG.md` states 575/531 — treat the exact count as NEEDS_VERIFICATION). | `server.js`, `routes/` |
| Auth guards | `Admin` (users table, `token`), `WebcamAdmin` (`webcamtoken`, 30 d), `SuperAdmin` (role `superadmin`), `AppAdmin` (employee `token` for mobile or `webToken` for the employee portal), `PanelUser` (`interview_panel_users`). | `middleware/auth.js`, `middleware/panelAuth.js` |
| Response envelope | `Helper.response(status, msg, data, res, code)`; many errors come back as HTTP 200 with `status:false` (or `status:'expired'`); most reads are `POST`. | `helper/helper.js` |
| Frontend permissions | Role matrix `DEFAULT_PERMISSIONS` (version `v10`) in `frontend/src/app/services/permission.service.ts`, cached in `localStorage` (`app_role_permissions`), plus per-user overrides from table `user_permissions`. Roles in the matrix: `admin, superadmin, hr, manager, director, recruiter` (+`employee`). `can()` returns true for an unknown key. **Enforced client-side only** except where noted (expense/asset/performance/project HR controllers check `admin|hr|superadmin`). | `permission.service.ts`, `controller/tenant/{expense,asset,performance,project}.js` |
| Integrations | Firebase FCM (push), Razorpay (public plan checkout), Tesseract OCR (expense receipts), Google Maps / reverse-geocode (tracking, `snap-to-roads`), SMS gateway (OTP), e-mail via `nodemailer` (interview/candidate mails); documents via `pdfmake` / `docx` / `pdf-parse`; spreadsheets via `xlsx`; QR labels via `qrcode`, external ATS resume-scoring HTTPS API, external Python AI-face service (not in repo). | `package.json`, controllers |
| Outdated duplicates | `backend/app/routes/app_6_10_2026.js` (40 routes, a subset of `app.js`) **is mounted** but shadowed by `app.js` (sort order puts `app.js` first); `backend/app/controller/tenant/appApi_10_6_2026.js` (191 KB vs 246 KB live `appApi.js`) is **imported nowhere**. **Both are outdated duplicates — do not use them as a source of truth.** Also ignore the commented-out legacy copies of `calculateAttendance` inside `salary.js`. | `server.js`, grep |
| Deployment | `Dockerfile` and `.github/workflows/deploy.yml` at repo root (contents not analysed here — NEEDS_VERIFICATION). | repo root |

Frontend feature folders under `frontend/src/app/`: `ai-insights, asset, attendance, branchwise, checkout, company-reg, dashboard, delete-account, emp-profile, employee, employee-portal, expense, interviewer, landing-*, layout, login, marketing, master, newdashboard, notifications, payroll, pending-emp-list, performance, project, recruitment, reports, superadmin, tracking`, and others. Attendance sub-screens: `add-comoff, ai-camera-management, ai-face-dashboard, ai-face-enrollment, ai-recognition-logs, attendance-upload, contractual-approval, date-wise-attendance, holiday, leave-ledger, leaves, logs, regularize, salary-master, shift-master, upload-leave, week-off-roster, weekend-emp-list`; tracking sub-screen: `live-tracking`.

### Frontend permission keys (from `permission.service.ts`)
`dashboard` · `emp-mgmt` (`emp-mgmt.add|leave|letters|insurance|profile.basic|document|insurance|workExp|bank|relieving|nda|offer|service|appointment`) · `attendance` (`att.shift|datewise|holiday|logs|leaves|leaveLedger|upload|regularize|weekend|compoff|contractual|aiFace|aiCameras|aiEnroll|aiLogs`) · `payroll` (`pay.generate|list|deduction|reimburse|appraisal|appraisalList|arrear`) · `assets` (`asset.dashboard|inventory|categories|clearance`) · `projects` (`proj.projects|clients|timesheets|reports`) · `expenses` (`exp.dashboard|claims|policies`; `exp.policies` = admin & superadmin only) · `performance` (`perf.dashboard|cycles|reviews|history`) · `reports` (`rep.employee|payroll|salaryRegister|late|tracking`) · `master` (`master.designation|department|emptype|docs|holidaytype|salary|payslip|branch|insurancePolicy`) · `setting` (`set.attmaster|currency|prefix|brand|handbook|appconfig|roleperm|userperm|sidebaraccess`) · `ai-insights` (`ai.attendance|payroll|leave|performance|attrition|recruitment`) · `tracking` · `recruitment` (`rec.dashboard|analysis|posting|candidates|offered|offerletter|user|master.round|master.roundtype|master.department|master.designation`).

### Module index
1 Authentication & onboarding · 2 Organisation masters · 3 Company settings & permissions · 4 Employee management · 5 Attendance · 6 AI face attendance · 7 Location tracking · 8 Leave · 9 Payroll · 10 Reports · 11 Reimbursement · 12 Expense · 13 Performance · 14 Projects & timesheets · 15 Assets · 16 Recruitment · 17 HR documents & letters · 18 Dashboard, notifications & audit · 19 Super admin & public site

---

## 1. Authentication and onboarding

* **Business purpose:** let companies sign up, let HR/admin staff, employees (mobile + portal), interviewers and platform operators sign in securely, one tenant per company code.
* **Problems solved:** tenant bootstrap, separate login paths per persona, OTP login for field employees, session invalidation by single stored token.
* **Users:** company admin/HR (web), employees (mobile app OTP; employee web portal OTP), interviewers (panel), super admin.
* **Features:** company registration with logo upload; admin/HR login (email + password + company code); mobile OTP login; employee-portal OTP login; AI-face web-cam token (`/AIlogin`); logout / app-logout; token check; interviewer OTP login; self-registration of employees (pending approval); `snap-to-roads` helper (in `web.js`).
* **Workflows:** register company → admin logs in → creates branch/prefix/attendance settings (manual) → adds employees. Employee: mobile number → OTP (5 min) → approved status required. Interviewer: `send-otp` → `verify-otp-login`.
* **Business rules (summary):** SHA-256 passwords, 8 h web JWT + 30 d webcam JWT stored on the user row; mobile JWT never expires; registration creates tenant + admin only (no subscription, no branch); fixed test OTPs exist. Detail: `BUSINESS_RULES.md` §2 (R-AUTH-01…12).
* **Required data:** tenant `companyCode`, company name, admin email/password; employee mobile; branch id via `branchid` header.
* **DB models:** `tenants`, `users`, `otps`, `subscriptions` (read at login/seat check), `empPersonals` (mobile/portal tokens), `interview_panel_users`.
* **Key APIs (routes):** `web.js`: `POST /login`, `/update-password` (public), `/app-login`, `/verify-otp`, `/AIlogin`, `/logout`, `/app-logout`, `/check-token`, `/company-register`, `/send-otp` + `/verify-otp-login` (interviewer), `/snap-to-roads`; `employeePortal.js`: `/employee-portal/send-otp`, `/employee-portal/verify-otp`; `empPer.js`: `/RegisterAppEmp` (public), `/check-tenant` (public); `interview.js`: `/panel-user-login`, `/panel-user-logout`.
* **Dependencies:** SMS gateway, JWT secret env, `crypto-js`; frontend `login`, `company-reg`, `employee-portal`, `interviewer` folders.
* **Permissions:** n/a (pre-auth); post-login permissions come from the matrix + `customPermissions` returned by login.
* **Validation:** required fields on registration (400/409); active-tenant check; OTP expiry.
* **Limitations / risks:** public `/update-password` takes over any account; hard-coded OTPs (`6669`, `1234`); single session per user; reflective CORS; no password policy/lockout/MFA found.
* **Verification status:** IMPLEMENTED (with security defects — see `AUTHENTICATION_AND_SECURITY.md`).

## 2. Organisation masters

* **Business purpose:** define the company structure and reference data every other module depends on.
* **Problems solved:** consistent departments/designations/branches, employee-code prefixes, employment types (full/half paid), holiday types, salary orders, currencies, document types.
* **Users:** admin, HR (and directors/managers read-only in places per the matrix).
* **Features:** department CRUD + dropdowns (`department-dd`, `designation-dd`); designation CRUD; branch CRUD (name, GPS `latitude/longitude`, geofence `range` in metres, image) + `branch-dd` + **copy-branch-master-data**; prefix CRUD; currency CRUD; employment type CRUD; holiday type CRUD; salary order CRUD; document type CRUD; countries/states/cities/pin-code reference data; skills master.
* **Workflows:** admin creates branch → prefix per branch → departments/designations → employment types → shifts/holidays; `copy-branch-master-data` clones masters to a new branch (also `scripts/copy-master-data.js`).
* **Business rules (summary):** employee code needs an active prefix for the branch; `half_paid` employment type halves payroll CTC; geofence applies only when `range > 0`. Detail: `BUSINESS_RULES.md` R-EMP-02, R-EMP-10, R-ATT-02.
* **Required data:** names, branch coordinates/range, prefix string.
* **DB models:** `branches`, `departments`, `designations` (FK department, CASCADE), `employmentTypes`, `prefixes`, `currencies`, `HolidayTypes`, `salary_orders`, `documentTypes`, `skills`, `countries`, `states`, `cities`, `pin_code_master`.
* **Key APIs:** `department.js` (`createDepartment/getDepartments/updateDepartment/deleteDepartment`, `department-dd`, `designation-dd`, prefix CRUD, Currency CRUD, branch CRUD + `branch-dd` + `copy-branch-master-data`); `designation.js`; `emp.js` (`EmpType`, `HolidayType`, `SalaryOrder` CRUD); `documentType.js`; `country.js`; `master.js`.
* **Dependencies:** every module reads these; audits `BRANCH_*`, `DEPARTMENT_*`, `DESIGNATION_*`, `EMPLOYMENT_TYPE_*`, `HOLIDAY_TYPE_*`, `PREFIX_*`, `CURRENCY_*`, `DOCUMENT_TYPE_*`, `SALARY_ORDER_CREATE`.
* **Permissions:** `master.designation|department|emptype|docs|holidaytype|salary|payslip|branch|insurancePolicy`, `set.currency|prefix`.
* **Validation:** per-controller duplicate-name checks (not individually traced — NEEDS_VERIFICATION); deletion guards for in-use masters UNKNOWN.
* **Limitations:** deleting a department cascades designations at DB level (if the FK exists); `branches.range` column is created by a model side effect; `branchId` header is not validated.
* **Verification status:** IMPLEMENTED.

## 3. Company settings and permissions

* **Business purpose:** tenant branding, policy documents, mobile-app tuning and fine-grained access control.
* **Problems solved:** per-company look (colours, logos), letterhead/handbook/insurance policy distribution, per-user menu/action overrides.
* **Users:** admin (superadmin for some).
* **Features:** brand colours; light/dark company logo upload/remove; letterhead, handbook and insurance-policy file upload; company profile (name/address); `app-config` (mobile settings such as image quality, driven by `app_config_fields` metadata and per-branch `app_config_values`); `tenant-users` list; per-user permission overrides (`user-permission` save/get/delete); role-permission matrix editor and sidebar-access screens (frontend `set.roleperm`, `set.userperm`, `set.sidebaraccess`).
* **Workflows:** admin edits matrix (browser `localStorage`) or saves a user override (`user_permissions.permissions` JSON text) → loaded at next login as `custom_user_permissions`.
* **Business rules (summary):** matrix is client-side (R-X-02); one `user_permissions` row per user (`userId` UNIQUE); app-config falls back to branch id `00000000-0000-0000-0000-000000000000` default row.
* **Required data:** files (multipart), colour JSON, permission JSON.
* **DB models:** `tenants` (brandColors, image, imageDark, letterhead, handbook, insurancePolicy), `user_permissions`, `app_config`, `app_config_fields`, `app_config_values`.
* **Key APIs (`master.js`, `setting.js`, `userPermission.js`):** `brand-colors`, `app-config`, `letterhead`, `handbook`, `insurance-policy`, `tenant-users`, `user-permission` (save/get/delete), `company-profile`, `company-logo`.
* **Dependencies:** file storage under `/upload`, `/uploads`; frontend `master`, `layout`.
* **Permissions:** `set.attmaster|currency|prefix|brand|handbook|appconfig|roleperm|userperm|sidebaraccess`.
* **Validation:** logo upload via `middleware/logoUpload.js`; other validations not traced.
* **Limitations:** **no server-side enforcement of the matrix**; uploaded files are served statically; `app_config*` models sync themselves on load.
* **Verification status:** IMPLEMENTED; enforcement PARTIALLY_IMPLEMENTED.

## 4. Employee management

* **Business purpose:** system of record for people — personal, job, bank, document, experience and insurance data — and the source for attendance, leave and payroll.
* **Problems solved:** onboarding (HR-created or self-registered), approval, branch assignment, document capture, salary set-up linkage.
* **Users:** HR/admin; managers/directors (team views); employees (own profile via mobile/portal).
* **Features:** create/get/update/delete employee; profile image upload with hash; employee list (`get-emp-list`), AI enrolment list (`get-ai-emp-list`, WebcamAdmin), mobile list (`app-emp-list`); approve-all-pending; check-by-mobile; assign-branches; work experience, bank account, documents (typed), insurance documents; old-salary history; week-off days per employee; contractual flag + hourly rate; offline-attendance and location flags; profile sub-tabs (basic/document/insurance/workExp/bank/relieving/NDA/offer/service/appointment).
* **Workflows:** HR create → auto empCode → `emp_status='approved'`; self-register (`RegisterAppEmp`) → `pending` → HR approve/reject; exit via `exitDate`/`status='inactive'`; relieving letter blocked by asset clearance.
* **Business rules (summary):** seat limit from subscription; prefix-based code (min 4 digits, ≤ 20 retries); duplicate mobile/email in branch; hard delete with partial manual cascade. Detail: `BUSINESS_RULES.md` §3 (R-EMP-01…12).
* **Required data:** name, mobile, email, branch, joining date, designation/department, employment type; shift name, reporting person for workflows.
* **DB models:** `empPersonals`, `workExperiences`, `documents`, `documentTypes`, `employeeInsuranceDocuments`, `bankAccnts`, `employee_old_salary`, `prefixes`.
* **Key APIs:** `empPer.js`: `createEmp, getEmp, updateEmp, deleteEmp, uploadImage, get-emp-list, get-ai-emp-list, app-emp-list, approve-all-pending-emp, checkEmpByMobile, assign-branches, RegisterAppEmp, check-tenant`; `workExp.js`, `bank.js`, `document.js`, `employeeInsurance.js`.
* **Dependencies:** Org masters (1→2), subscription seats, shift/week-off, payroll, assets (clearance), FCM tokens.
* **Permissions:** `emp-mgmt.add|leave|letters|insurance|profile.*`.
* **Validation:** duplicate checks; `dd/mm/yyyy` DOB parsing; per-tab validations in the Angular forms (not re-checked by the API).
* **Limitations:** hard delete leaves orphans; recruitment → employee conversion NOT_FOUND; offboarding workflow minimal; `empPersonals` is very wide (single table for everything) and `shift_id` stores a shift **name**; `empPersonals.role` is free text (`manager`, `director`, `teamLeader`, `project_manager`, `recruiter`, …) separate from `users.role`.
* **Verification status:** IMPLEMENTED.

## 5. Attendance (shifts, week-off, holidays, regularisation)

* **Business purpose:** record and correct daily presence and feed leave/payroll.
* **Problems solved:** shift-aware punches, geofenced mobile punching, bulk corrections, week-off rosters, late reporting, regularisation, weekend/comp-off earning.
* **Users:** HR/admin, managers (team), employees (mobile/portal), contractual staff approvers.
* **Features:** attendance settings; shifts (per weekday); holidays (+restricted holidays); date-wise / employee / late / weekend reports; add/update/bulk-update/delete attendance; bulk upload attendance and leaves (Excel/CSV) and download template; week-off roster (list/save/delete/upload) and per-employee fixed week-off days; regularisation request/approve; manual and weekend comp-off; contractual-day approval; mobile mark attendance (geofence); employee portal punch.
* **Workflows:** employee punches (first = in, later = out) → HR corrects/uploads → payroll reads. Regularisation: employee requests → approver acts (original times stored for restore). Weekend work → comp-off generate/approve → leave balance +1.
* **Business rules (summary):** grace / late allowance (count) / half-day threshold / half-day→absent hours; week-off priority roster > employee days > shift; `getWorkingDays` Sat/Sun hard-code only for dashboard. Detail: `BUSINESS_RULES.md` §4 (R-ATT-01…14).
* **Required data:** `attendanceSettings` row per tenant+branch (missing → payroll 500), shifts for each shift name, holidays, optional roster.
* **DB models:** `attendances`, `attendanceSettings`, `attendance_regularizations`, `shifts`, `holidays`, `HolidayTypes`, `employee_week_off_roster`, `contractual_day_approvals`, `comp_off`.
* **Key APIs:** `attendance.js`: `attendance-setting`, `get-attendance-setting`, `update-attendance-setting`, `get-emp-attendance`, `get-late-attendance`, `get-weekend-attendance`, `get-date-wise-attendance`, `add-attendance`, `upload-attendance`, `upload-leave`, `download`, `update-attendance`, `bulk-update-attendance`, `delete-attendance`, holiday CRUD, `create-manually-comp-off`, `list-manually-comp-off`, `contractual-attendance-list|approve|employees`; `shift.js`: `createShift/getShift/updateShift/deleteShift` and **unauthenticated** `POST /generateDummyAttendance`; `weekOff.js`: `/weekoff/roster/list|save|delete|upload`; `app.js`: `mark-attendance`, `create-regularization`, `regularization-list`, `pending-regularize-list` (Admin), `update-status` (Admin), `get-attendance-by-date`. The employee web portal authenticates with `employeePortal.js` (OTP) and then calls the `AppAdmin` (`webToken`) routes above; `helper/attendancePunch.js` is documented as shared by HR UI, portal and AI face.
* **Dependencies:** employees, leave, payroll (`calculateAttendance`), AI face (shared `helper/attendancePunch.js`), asset clearance none; DB script `scripts/sql/employee_week_off.sql`.
* **Permissions:** `att.shift|datewise|holiday|logs|leaves|leaveLedger|upload|regularize|weekend|compoff|contractual`, `rep.late`.
* **Validation:** punch helper requires tenant/branch/datetime/ip; shift name uniqueness; comp-off dates must be past; geofence distance.
* **Limitations:** UTC/local date mix in mobile punch; field-name mismatch create vs update settings; `isofflineAllTimeAtt` validation commented out; attendance times stored as strings (incl. `WEEK_OFF`); contractual approvals not used by payroll; dashboards use a different working-day definition.
* **Verification status:** IMPLEMENTED (defects listed).

## 6. AI face attendance

* **Business purpose:** touchless camera-based attendance using face recognition.
* **Problems solved:** buddy-punching, queueing at kiosks; CCTV/RTSP camera support.
* **Users:** admin/HR (set-up, monitoring), the external AI service (machine caller), employees (enrolled faces).
* **Features:** health check; enrol employee faces (multiple images, duplicate-face rejection by threshold); deactivate embeddings; enrolled list; camera CRUD with encrypted RTSP URL, test/preview/start/stop; recognition logs; dashboard; processing config (threshold, FPS, dedupe, retention); internal punch + unknown-face callbacks; `AIlogin` for the web-cam page.
* **Workflows:** admin enrols faces → backend asks the AI service for embeddings and stores them → cameras started via the AI service → recognised events call `/ai-face/internal/punch` → `recordAttendancePunch` → log row.
* **Business rules (summary):** default threshold 0.48, dedupe 30 s, auto-migration of strict legacy defaults, shared service key (`dev-ai-face-key` default), always-punch semantics. Detail: `BUSINESS_RULES.md` R-ATT-13.
* **Required data:** `AI_FACE_SERVICE_URL`, `AI_FACE_SERVICE_KEY`, `AI_FACE_SECRET`, enrolled employees with a clear photo, reachable RTSP cameras.
* **DB models:** `ai_cameras`, `ai_camera_health_logs`, `ai_face_embeddings` (BYTEA), `ai_processing_config`, `ai_recognition_logs`; writes `attendances`.
* **Key APIs (`aiFace.js`, 30 routes):** `/ai-face/health`, `enroll/:employeeId`, `employee/:employeeId`, `enrolled-list`, cameras CRUD/test/preview/start/stop, `recognition-logs`, `dashboard`, `config`, `config/update`, and unauthenticated-by-JWT `/ai-face/internal/punch`, `/ai-face/internal/unknown` (service key header only); `web.js` `/AIlogin`; `empPer.js` `get-ai-emp-list`.
* **Dependencies:** external recognition service (**NOT_FOUND in repo**, no `*.py`), attendance helper, `scripts/create-ai-face-tables.js` (tables are **not** created by `server.js`); frontend `ai-camera-management`, `ai-face-dashboard`, `ai-face-enrollment`, `ai-recognition-logs`.
* **Permissions:** `att.aiFace|aiCameras|aiEnroll|aiLogs`.
* **Validation:** image/quality checks happen in the external service; duplicate face rejection in `enrollEmployee`.
* **Limitations:** biometric data in a plain BYTEA column; one shared key for all tenants; no liveness/anti-spoof logic visible; no retention job found for `retentionDays` (NEEDS_VERIFICATION); service availability unknown.
* **Verification status:** PARTIALLY_IMPLEMENTED (backend only; service dependency not in repo).

## 7. Location tracking

* **Business purpose:** follow field employees and capture client visits.
* **Problems solved:** proof of visit, route history, live position.
* **Users:** field employees (mobile app), managers/HR (maps and reports).
* **Features:** GPS ingestion (single + offline bulk), pinned-visit logic, visit remark/purpose/client details, live location, history, active-location employee lists, visit report, visit-place dropdown.
* **Workflows:** app posts coords (foreground/background) → server assigns `normal`/`pinned` using a 50 m / 1 h rule → admins see list, live, history and reports.
* **Business rules (summary):** only employees with `isLocation` are tracked; pinned rule in R-ATT-14.
* **Required data:** device id, OS (A/I/W), coordinates, mode.
* **DB models:** `device_location_logs`.
* **Key APIs:** `app.js`/`emp.js`: `track-location`, `list-track-location`, `pinned-track-location`, `update-track-remark`, `latest-location`, `track-location-history`, `track-live-location-history`, `active-location-emp`, `update-active-location`, `app-active-location-emp`, `app-track-location-history`, `visit-report`, `getVisitPlaceDD`; `web.js` `/snap-to-roads`.
* **Dependencies:** Google/VTS geocoding, mobile app; frontend `tracking/live-tracking`.
* **Permissions:** `tracking`, `rep.tracking`.
* **Validation:** `branchId`/tenant required; points without coordinates are dropped in offline batches.
* **Limitations:** the DBML `tracking_sessions/points/task_updates` tables do **not** exist as models (DOCUMENTED_ONLY); large commented-out code blocks in `tracking.js`; high-volume table has no retention logic found.
* **Verification status:** IMPLEMENTED.

## 8. Leave management

* **Business purpose:** leave policies, balances, applications, approvals and comp-off.
* **Problems solved:** policy per leave type, monthly balances, paid/unpaid outcome at payroll, restricted holidays, comp-off for weekend work.
* **Users:** HR/admin, managers/directors (approve/recommend), employees (apply).
* **Features:** leave master CRUD; assign/update/delete balances; apply/edit/cancel leave; approval statuses `pending|recommended|approved|rejected|escalate|self_declined`; leave lists (employee, status-wise, pending, team, director); ledger; comp-off generate/approve/list; bulk leave upload.
* **Workflows:** HR assigns monthly balance → employee applies (web or mobile) → manager recommends/approves → payroll consumes balance (balance changes only at payroll).
* **Business rules (summary):** gender restriction, apply-before-days, RH rule, no balance check on apply, CL carry-forward by name, comp-off code `"002"`, double-deduction risk. Detail: `BUSINESS_RULES.md` §5.
* **Required data:** leave masters, balances per month, holidays (for RH), reporting person.
* **DB models:** `leave_masters`, `leave_applications`, `leave_balances`, `comp_off` (`leaveLedger.js` empty).
* **Key APIs (`leave.js`, 16 routes):** `create-leave`, `get-leaves`, `update-leaves`, `delete-leaves`, `assign-leave`, `update-assign-leave`, `delete-assign-leave`, `get-leave-type-dd`, `get-leave-by-emp`, `get-leave-ledger`, `apply-leave`, `update-applied-leave`, `update-apply-leave-status`, `get-applied-leaves`, `generate-comp-off-leave`, `approve-comp-off-leave`; mobile (`app.js` → `appApi.js`): `apply-leaves`, `update-apply-leaves-status`, `get-emp-leave-list`, `status-wise-leave-list`, `pending-leave-list` (declared twice), `team-leave-list`, `director-leave-list`, `comp-off-list`.
* **Dependencies:** attendance (week-offs/holidays), payroll (`calculateAttendance`, `generateSalary`), FCM (`notifyManagerOnLeaveApply`).
* **Permissions:** `emp-mgmt.leave`, `att.leaves|leaveLedger|compoff`.
* **Validation:** type exists, gender, notice days, duplicate range, RH holiday; comp-off remaining days (mobile).
* **Limitations:** many master flags (`isPaid`, `enCashable`, `carryForward`, `maxCarryForward`, `allowedPerYear`) are unused in calculations; status updates unvalidated and not tenant-scoped; `short_leave`/`escalate` semantics unclear; mobile apply takes `employeeId` from the body.
* **Verification status:** IMPLEMENTED (with gaps listed).

## 9. Payroll

* **Business purpose:** turn attendance, leave and salary structure into payslips.
* **Problems solved:** per-day LOP calculation with grace/late/half-day rules, sandwich leave, salary structure versioning, appraisal increments, arrears, payslip documents.
* **Users:** HR/admin (payroll), employees (payslip view in app/portal).
* **Features:** salary set-up (CTC, basics, allowances, deductions, variables); component master; attendance calculation preview per employee; component calculation; generate salary (bulk); generated list; revert; bill details; salary doc submit; appraisal preview/apply/list/update; arrears create/submit/approve/reject/pay; old-salary history.
* **Workflows:** set up CTC → monthly: calculate attendance → calculate components → HR edits → `generate-Salary` → payslip/PDF; increment: appraisal → arrears for back-dated months → paid in the payout-month payroll.
* **Business rules (summary):** `perDay = CTC/12/days-in-month`; day classification order; sandwich rule; client-trusted generation; CL carry-forward; no statutory deductions. Detail: `BUSINESS_RULES.md` §6.
* **Required data:** active `Basics` CTC row, `attendanceSettings`, shift & week-off data, leave records, employment type.
* **DB models:** `master_components`, `Basics`, `allowances`, `deductions`, `bills`, `bill_infos`, `salarydocs`, `salary_orders`, `arrears`, `arrear_details`, `employee_old_salary`, `leave_balances`, `comp_off`.
* **Key APIs:** `salary.js` (12): `calculate-attendance`, `calculate-salary-component`, `employee-monthly-leave-attendance-details`, `generate-Salary`, `generate-Salary-list`, `revert-Salary`, `setup-salary`, `update-salary`, `get-active-salary-component`, `getComponentDD`, `getBillDetails`, `SubmitSalaryDoc`; `basic.js` (`createBasic/getBasic/updateBasic/deleteBasic/getBasicSalaryEmployee/updateSalarySetUp/createVariable`); `allowance.js` (4); `deduction.js` (create/get/update-deduction-master); `master.js` (create/update/get/delete-component); `arrear.js` (14); `appraisal.js` (8).
* **Dependencies:** attendance, leave, employees, `helper/helper.js` (`applySandwichRule`, `adjustLeaveRecords`, `computeLatePayrollPreview`), `helper/weekOff.js`.
* **Permissions:** `pay.generate|list|deduction|appraisal|appraisalList|arrear`, `master.salary|payslip`.
* **Validation:** skip already-billed months; positive-increment checks; arrear branch required; many numeric fields are client-driven.
* **Limitations:** server does not recompute at generation; calculation endpoint mutates deductions; revert incomplete; no PF/ESI/PT/TDS (NOT_FOUND); contractual/hourly pay not implemented; expense and asset recoveries do not flow in; amounts partly stored as strings/floats.
* **Verification status:** IMPLEMENTED (core), statutory PARTIALLY_IMPLEMENTED→NOT_FOUND.

## 10. Reports

* **Business purpose:** tabular extracts for HR, payroll and attendance review.
* **Users:** HR/admin, directors/managers.
* **Features:** employee report, payroll report, salary-register report (`report.js` — 3 endpoints); late attendance report and weekend report (attendance module); tracking/visit report (tracking module); date-wise attendance; expense report (`/expense/report`); project reports (utilization, projects, clients, reconciliation); performance report/history; asset dashboards/clearance report; AI-insights screens (frontend `ai-insights`; backend source for `ai.*` keys UNKNOWN).
* **Business rules (summary):** reports read live tables with tenant/branch filters; no scheduled/exported report engine found beyond Excel download endpoints.
* **DB models:** none dedicated (reads `empPersonals`, `attendances`, `bills`, `bill_infos`, etc.).
* **Key APIs:** `report.js`: `employee-report`, `payroll-report`, `salary-register-report`; see modules 5, 7, 12–15.
* **Permissions:** `rep.employee|payroll|salaryRegister|late|tracking`, `ai.*`.
* **Limitations:** only three first-class report endpoints; **AI Insights** menu items (`ai.attendance|payroll|leave|performance|attrition|recruitment`) have no identifiable backend analytics (NEEDS_VERIFICATION — check `frontend/src/app/ai-insights`).
* **Verification status:** PARTIALLY_IMPLEMENTED.

## 11. Reimbursement (legacy)

* **Business purpose:** simple employee claim for out-of-pocket costs with HR decision.
* **Users:** employees (mobile), managers, HR/admin.
* **Features:** add/list/update/delete reimbursement with files; status updates; team reimbursements for managers.
* **Workflows:** employee submits (`pending`) → manager/HR updates status (`recommended`/`approved`/`rejected`) → `paid`.
* **Business rules (summary):** single-step decision; INTEGER amount; audits `REIMBURSEMENT_*`; shares the `reimbursements` header with the Expense module. Detail: R-RMB-01.
* **DB models:** `reimbursements`, `reimbursement_files` (FK CASCADE; `associations.js` is not loaded).
* **Key APIs:** `attendance.js` (admin): `add-reimbursement`, `fetchReimbursement`, `update-reimbursement`, `update-reimbursement-status`, `delete-reimbursement`; `app.js` (mobile): `add-app-reimbursement`, `reimbursement-list`, `team-reimbursements`, `update-app-reimbursement-status`.
* **Dependencies:** Expense module (claims appear as `kind=legacy`); payroll has **no** integration.
* **Permissions:** `pay.reimburse`.
* **Limitations:** reimbursement endpoints physically live in the attendance controller/routes; no policy limits; amounts are integers.
* **Verification status:** IMPLEMENTED.

## 12. Expense management

* **Business purpose:** policy-driven expense claims with receipts, OCR, duplicate detection and multi-level approval.
* **Problems solved:** limits per category, receipt enforcement, flagging, finance/HR approval chains, payment tracking.
* **Users:** employees (submit), managers/skip-managers/finance (approve via portal), HR/admin (policy, override, mark paid).
* **Features:** categories, approval rules (amount ranges, priority, levels), settings (default levels, finance approvers, flagged-requires-HR, claim prefix); employee receipt upload with OCR, validate, submit, cancel; approvals inbox; HR claim list/detail/act/mark-paid; payables; dashboard; report.
* **Workflows:** employee uploads receipts → validate → submit (rule resolution → levels, flags) → approvers act → approved → finance/HR marks paid.
* **Business rules (summary):** level resolution, validation, duplicate signals, claim number format, auto-approve when all levels skipped, pay modes. Detail: R-EXP-01…06.
* **Required data:** categories, rules or defaults, `financeEmployeeIds`, `reportingPersonId` on employees.
* **DB models:** `expense_categories`, `expense_approval_rules`, `expense_settings`, `expense_receipts`, `expense_items`, `expense_claims`, `expense_approvals` (+ `reimbursements`, `reimbursement_files`).
* **Key APIs (`expense.js`, 24):** HR/Admin `/expense/category|rule|settings|claim/list|detail|act|mark-paid|dashboard|report`; employee/approver (AppAdmin) `/expense/my/categories|receipt|validate|submit|claims|cancel|claim-detail|approvals|act|payables|mark-paid`.
* **Dependencies:** `helper/expense.js`, Tesseract OCR, reporting hierarchy, FCM (NEEDS_VERIFICATION).
* **Permissions:** `exp.dashboard|claims|policies` (policies admin/superadmin); HR endpoints re-check role server-side.
* **Validation:** see R-EXP-03.
* **Limitations:** "payroll" payment mode is a label only (no payslip integration); race-prone claim numbering; header amount rounded to integer.
* **Verification status:** IMPLEMENTED (payroll integration PARTIALLY_IMPLEMENTED).

## 13. Performance management

* **Business purpose:** cycle-based appraisal with OKR/KPI goals, self/manager/360 ratings and multi-level approval.
* **Users:** HR/admin (cycles, reports), managers (manager review), employees (goals, self review, feedback), directors/skip-managers (approval).
* **Features:** cycles (launch/close), reviews (lock goals, skip self, approve), goals (save/delete/progress/bulk-assign), 360 feedback request/remove, dashboard (incl. nine-box), report, history; employee portal `/performance/my/*`.
* **Workflows:** HR creates and launches a cycle → goals set (weights must total 100) → lock → self review → feedback → manager review → approval levels → `approved`.
* **Business rules (summary):** achievement clamp 0–120, rating = achievement/20 in 1–5, weights 50/30/20 with re-normalisation, bands and nine-box, rejection returns to manager review. Detail: R-PRF-01…11.
* **DB models:** `pm_cycles`, `pm_goals`, `pm_key_results`, `pm_reviews`, `pm_review_approvals`, `pm_feedback`.
* **Key APIs (`performance.js`, 34):** `/performance/cycle/list|save|delete|launch|close`, review list/detail/lock-goals/skip-self/approve, goal save/delete/progress/bulk-assign, feedback request/remove, dashboard, report, history, and `/performance/my/*`.
* **Dependencies:** `helper/performance.js`, reporting person/skip-manager derivation, FCM (NEEDS_VERIFICATION).
* **Permissions:** `perf.dashboard|cycles|reviews|history`; HR endpoints re-check role.
* **Validation:** see R-PRF-03, -08, -09, -10.
* **Limitations:** no link from ratings to increments/payroll (separate appraisal in Payroll); competency list is configuration JSON.
* **Verification status:** IMPLEMENTED.

## 14. Projects and timesheets

* **Business purpose:** project/client set-up, allocation, weekly timesheets and utilisation/billing insight.
* **Users:** HR/admin/project managers (set-up, reports), employees (log time), reporting managers (approve).
* **Features:** settings (working days, hours/day, tolerance); clients; projects; allocations (% and rates); tasks/subtasks; weekly timesheets with manual entries and timers; submit/approve/reject; reports (utilization, projects, clients, reconciliation with attendance/leave/holidays).
* **Workflows:** HR creates project → allocates members → employees log time per day (≤ 24 h, only on allocated dates) → submit week → manager approves/rejects → reports count submitted+approved weeks.
* **Business rules (summary):** R-PRJ-01…09.
* **DB models:** `pt_clients`, `pt_projects`, `pt_allocations`, `pt_tasks`, `pt_timesheets`, `pt_time_entries`, `pt_settings`.
* **Key APIs (`project.js`, 34):** `/project/settings`, client list/save, project list/save/detail, allocation save/remove, task save/delete, timesheet list/detail/act, `/project/report/utilization|projects|clients|reconciliation`, `/project/my/*` (week, entry save/delete, timer start/stop, submit, approvals, act…).
* **Dependencies:** `helper/projectTime.js`; reads attendance, leave, holidays (read-only).
* **Permissions:** `proj.projects|clients|timesheets|reports`.
* **Limitations:** timesheets never feed payroll or billing documents; reconciliation ignores shift/week-off resolver; invoice generation NOT_FOUND.
* **Verification status:** IMPLEMENTED.

## 15. Assets

* **Business purpose:** register company assets, allocate to employees with acknowledgement, track maintenance, and gate exit.
* **Users:** HR/admin (inventory), employees (acknowledge/return request), exit coordinators.
* **Features:** categories (code prefix, acknowledgement flag); register (1–200 units); update; detail; status change; QR scan/labels; allocate/return; maintenance open/close; employee holdings; clearance report and override; dashboard; employee portal `/asset/my/list|acknowledge|request-return`.
* **Workflows:** register → allocate (ack pending) → employee acknowledges/disputes → return (condition, recovery) → maintenance cycles; exit: relieving letter blocked until assets are returned (override audited).
* **Business rules (summary):** R-AST-01…09.
* **DB models:** `as_categories`, `as_assets`, `as_allocations`, `as_maintenance`, `as_events`.
* **Key APIs (`asset.js`, 20):** `category list/save`, `list`, `register`, `update`, `detail`, `status`, `scan`, `labels`, `allocate`, `return`, `maintenance open/close`, `employee`, `clearance`, `clearance/override`, `dashboard`, `/asset/my/*`.
* **Dependencies:** `helper/assets.js`, `letter_data.js` (clearance guard), `qrcode`.
* **Permissions:** `asset.dashboard|inventory|categories|clearance`.
* **Limitations:** recovery amount not deducted in payroll; depreciation/disposal accounting NOT_FOUND; no bulk allocation.
* **Verification status:** IMPLEMENTED.

## 16. Recruitment

* **Business purpose:** publish jobs, collect applications, screen with ATS, run interviews with internal/external panels, issue offers.
* **Users:** recruiters/HR (pipeline), interviewers (panel users), candidates (public form).
* **Features:** job requirements CRUD, publish with token/expiry link; public job posting, duplicate check, application submit (resume upload); admin pipeline, application detail, ATS score save, stage update, application edit (only at first stage); interview rounds and round types masters; schedule/assign interviewer/e-mail; panel-user CRUD/login/my interviews/feedback; offer letters (create, duplicate check, PDF, fetch by phone); skills master; recruitment dashboard/analysis screens.
* **Workflows:** HR posts job → candidate applies publicly → external ATS scores resume → HR shortlists → rounds scheduled → interviewers submit feedback → `offered` when all assigned rounds have feedback → HR issues an offer letter (typed record) → manual employee creation.
* **Business rules (summary):** R-REC-01…11 (final score = average of ATS and manual; duplicate rules; reject stops pipeline).
* **DB models:** `job_requirements`, `candidates`, `applications`, `candidate_ats_scores`, `candidate_interview_rounds`, `candidate_interview_feedback`, `interview_rounds`, `round_types`, `interview_panel_users`, `offer_letters`, `skills`.
* **Key APIs:** `candidate.js` (9): `public-job-posting`, `check-duplicate-application`, `submit-application`, `list-applications`, `admin-pipeline`, `application-detail`, `save-ats-score`, `update-stage`, `update-application`; `job.js` (12): `createJobRequirement/update/delete/get`, `publishJob`, `get-skills`, `saveJobLink`, offer-letter save/get/check-duplicate/generate PDF/get-by-phone; `interview.js` (24): InterviewRound CRUD/reorder, RoundType CRUD, `interview-schedule-detail`, `save-interview-schedule`, `save-interview-feedback`, InterviewPanelUser CRUD, `assign-interviewer`, `send-interview-mail`, `panel-user-login`, `panel-user-logout`, `get-my-interviews`, `panel-save-feedback`, `panel-feedback-detail`.
* **Dependencies:** external ATS URL, SMTP, `middleware/panelAuth.js`; only module with Sequelize associations (`models/index.js`); frontend `recruitment`, `interviewer`.
* **Permissions:** `rec.dashboard|analysis|posting|candidates|offered|offerletter|user|master.*`.
* **Limitations:** global candidates table (no `tenantId`, cross-tenant overwrite by e-mail); no hire → employee conversion; external ATS demo host hard-coded; stage is a free string; `offered` without positive recommendation.
* **Verification status:** IMPLEMENTED (external ATS dependency).

## 17. HR documents and letters

* **Business purpose:** generate employee letters and templated HR documents.
* **Users:** HR/admin; employees (view own).
* **Features:** letter records and PDFs (NDA, appointment, relieving, offer, service) with stats and bulk PDF; template engine with variable catalogue, preview, save-generated and history; salary-slip documents; offer-letter PDFs (recruitment).
* **Workflows:** HR fills letter data → generates PDF (letterhead from tenant settings) → relieving letter checks asset clearance.
* **Business rules (summary):** R-DOC-01/02, R-AST-08.
* **DB models:** `letter_data`, `document_templates`, `generated_documents`, `salarydocs`, `offer_letters`.
* **Key APIs:** `documentTemplate.js` (10): `hr-template-variables|create|update|list|get|delete|preview|save-generated|generated-list|generated-get`; `letter_data.js` (5): `save-letter-data`, `get-letter-data`, `get-letter-stats`, `generate-letter-pdf`, `generate-all-letters-pdf`; `salary.js` `SubmitSalaryDoc`; PDFs served from `/download/:file` (`uploads/pdfs`).
* **Dependencies:** `pdfmake` / `docx` (PDF/Word generation — which library each letter uses is NEEDS_VERIFICATION), tenant letterhead, `docs/hr-document-template-spec.md`.
* **Permissions:** `emp-mgmt.letters`, `emp-mgmt.profile.relieving|nda|offer|service|appointment`.
* **Limitations:** `/download/:file` is a public static-style route (access control NEEDS_VERIFICATION); template variable semantics not re-verified.
* **Verification status:** IMPLEMENTED.

## 18. Dashboard, notifications and audit

* **Business purpose:** at-a-glance KPIs, in-app/push notifications and a change log.
* **Users:** all web roles; employees (mobile notifications).
* **Features:** role-aware dashboard, attendance chart, department-wise and team-wise attendance, today's attendance; header notifications with read-state; mobile notifications and mark-read; FCM pushes (e.g. leave application → manager); audit list.
* **Business rules (summary):** dashboard working days use a Sat/Sun hard-code; audit writes never block business actions. Detail: R-X-03, R-ATT-06, R-DOC-03…05.
* **DB models:** `log` (paranoid), `notification_reads`.
* **Key APIs:** `emp.js`: `/dashboard`, `dashboard-attendance-chart`, `dashboard-attendance-by-department`, `today-attendance`, `team-wise-attendance`, `header-notifications`, `mark-header-notifications-read`; `app.js`: `/notification`, `mark-notifications-read`; `audit.js`: `/audit/list`.
* **Dependencies:** `controller/tenant/dashboard.js`, `headerNotifications.js`, `helper/auditLog.js`, Firebase Admin.
* **Permissions:** `dashboard`; audit access enforced only by the `Admin` guard.
* **Limitations:** audit coverage incomplete (R-X-03); `newdashboard` vs `dashboard` frontend folders suggest two generations (NEEDS_VERIFICATION which is live).
* **Verification status:** IMPLEMENTED.

## 19. Super admin and public site

* **Business purpose:** operate the SaaS: plans, tenants, subscriptions, marketing site, payments entry point.
* **Users:** platform super admin; prospective customers (public).
* **Features:** super-admin login, forgot/reset password; stats and analytics (tenants, users, expiring subscriptions within 30 days); plans CRUD + status; tenants list/status/update/company snapshot; subscriptions upsert/history (`startsAt`/`endsAt` required, `seats` optional); users list/update; landing-page content CMS; contact-message inbox; public landing content, contact form, plan details and Razorpay subscription start.
* **Workflows:** super admin defines plans → customer registers (`company-register`) → super admin upserts a subscription (manual) → seats enforced at employee creation; marketing content edited via `landing-content`.
* **Business rules (summary):** R-AUTH-08/09/10; no automatic subscription activation after payment.
* **DB models:** `tenants`, `plan_masters`, `subscriptions`, `users` (role `superadmin`), `landing_site_contents` (slug UNIQUE, JSON payload), `landing_contact_submissions`.
* **Key APIs:** `superadmin.js` (20): login, forgot/reset-password, stats, plans CRUD/status, tenants list/status/update/subscription/company-snapshot/subscriptions, users, analytics, landing-content, contact-messages; `public.js` (4): `/public/landing`, `/public/contact`, `/public/plan/:planId`, `/public/razorpay/subscription-start`.
* **Dependencies:** Razorpay SDK (`controller/publicPayment.js`, `lib/planPayment.js`: `isPlanFree`, `getRazorpayPlanId` from plan `metadata.razorpayPlanId`), frontend `superadmin`, `landing-*`, `marketing`, `checkout`.
* **Permissions:** `SuperAdmin` guard (role `superadmin`, system tenant).
* **Validation:** plan must be active; free plans cannot use checkout; Razorpay plan id must be configured.
* **Limitations:** no webhook / signature verification / subscription creation after payment; super-admin `updateTenantStatus` effect on logins is only via the active-tenant check; tenant `plan` is free text not linked to `plan_masters`; module-level entitlement tables from the DBML (`platform_modules`, `tenant_module_access`) are DOCUMENTED_ONLY.
* **Verification status:** IMPLEMENTED (payment confirmation NOT_FOUND).

---

## Appendix A — Cross-module dependency map

| Producer | Consumer | Link |
|---|---|---|
| Org masters (branch range, prefixes, employment types) | Employee, Attendance, Payroll | geofence, empCode, half-paid CTC |
| Employee (`shift_id` name, `week_off_days`, reporting person) | Attendance, Leave, Expense, Projects, Performance | resolver, approvers |
| Attendance + holidays + roster | Leave (RH, comp-off), Payroll, Projects reconciliation, Dashboard | R-ATT-05/06 |
| Leave (+ comp-off) | Payroll | balance consumption at generation |
| Payroll (bills) | Arrears, Reports | arrears read bills; reports read bills |
| Assets (clearance) | HR letters | relieving-letter guard |
| Expense / Reimbursement | Payroll | **no integration** (label only) |
| Projects / Contractual approvals / hourlyRate | Payroll | **no integration** |
| Recruitment | Employee | **no integration** (manual re-entry) |
| AI face / mobile / portal | Attendance | `helper/attendancePunch.js` |

## Appendix B — Items to verify before relying on this catalog

1. Exact route count (528 vs 531 vs 575 claims) — regenerate with `docs/_gen_api_catalog.js`.
2. Whether all tables exist and FKs/unique indexes are enforced in the live DB (`DATABASE_SCHEMA.md` §10).
3. Backend source of the **AI Insights** screens.
4. Deployment configuration (`Dockerfile`, `deploy.yml`) and environment variables (JWT secret, SMS, FCM, Razorpay, AI-face keys).
5. Which dashboard folder (`dashboard` vs `newdashboard`) the router actually uses.
