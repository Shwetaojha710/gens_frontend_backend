# USER_ROLES_AND_PERMISSIONS

> **Scope:** Roles, permissions, module access, data visibility, tenant/branch restrictions and approval authority of the existing GENS.Ai HRMS (`e:\gens_frontend_backend`).
> **Method:** Evidence-based. Every statement was re-verified by reading source files (repo HEAD `8da240c`, reviewed 2026-11-19). Nothing here describes behaviour that was not found in code. No secrets are reproduced.
> **Labels:** `IMPLEMENTED` · `PARTIALLY_IMPLEMENTED` · `DOCUMENTED_ONLY` · `NOT_FOUND` · `UNKNOWN` · `NEEDS_VERIFICATION`
> **Related KB files:** `API_CATALOG.md`, `SYSTEM_OVERVIEW.md`, `AUTHENTICATION_AND_SECURITY.md`, `WORKFLOW_DOCUMENTATION.md`.

---

## 1. Executive summary

| Topic | Finding | Status |
|---|---|---|
| Server-side authentication | Five guards: `Admin`, `WebcamAdmin`, `SuperAdmin`, `AppAdmin` (`backend/app/middleware/auth.js`) and `PanelUser` (`backend/app/middleware/panelAuth.js`) | IMPLEMENTED |
| Server-side **role-based** authorization per route | Only a coarse role allow-list inside each guard. **Exception (verified):** four newer HR-side modules — `/expense/*` (`controller/tenant/expense.js`), `/asset/*` (`asset.js`), `/project/*` (`project.js`) and `/performance/*` (`performance.js`) — wrap every handler in an `HR_ROLES = [admin, hr, superadmin]` check, so an `employee`-role `users` row passing the `Admin` guard is refused there. No per-route role check was found for any other module (employees, attendance, leave, payroll, recruitment, master, documents, reports, audit, AI Face). | PARTIALLY_IMPLEMENTED (4 modules only) |
| Frontend permission matrix | `DEFAULT_PERMISSIONS` in `frontend/src/app/services/permission.service.ts` (109 keys × 6 roles) | IMPLEMENTED (UI only) |
| Is the matrix enforced by the API? | **No.** It only hides menus / blocks Angular routes (`permission.guard.ts`). Outside the four `HR_ROLES`-checked modules, any holder of a valid `Admin`-guard token (roles `admin`, `hr`, `superadmin`, `employee`) can call any `Admin` route directly. Even in those four modules the check is only "is HR-class"; it does not distinguish `hr` from `admin`, so UI keys such as `exp.policies` (admin, superadmin only) are not enforced. | IMPLEMENTED as UI-only; server enforcement PARTIAL |
| Role-permission edits (Settings → Role Permissions) | Saved to the browser's `localStorage` only (`app_role_permissions`); **not** sent to the server | IMPLEMENTED (client-local) |
| Per-user custom permissions | Saved in DB table `user_permissions` (`/save-user-permission`), delivered at login as `customPermissions`, then stored in `localStorage` (`custom_user_permissions`) and used **only by the UI** | PARTIALLY_IMPLEMENTED |
| Tenant isolation | Manual `where: { tenantId }` in controllers; no global scope / row-level security | PARTIALLY_IMPLEMENTED |
| Branch isolation | Branch for HR/Admin calls is read from the **client-supplied `branchid` header** and is not validated against the user's assigned branches | PARTIALLY_IMPLEMENTED (weak) |
| Employee-portal approver authority | Decided by ad-hoc role-string checks inside individual controllers (see §8); several flows do **not** verify the approver is the employee's reporting manager | PARTIALLY_IMPLEMENTED |

---

## 2. Roles discovered

### 2.1 Identity stores (who can log in, and where the role lives)

| Identity store (table) | Login path | Guard | Role field | Evidence |
|---|---|---|---|---|
| `users` — company admin / HR / platform operator | `POST /api/login` (email + password + company code) | `Admin`, `WebcamAdmin`, `SuperAdmin` | `users.role` — Sequelize `ENUM('admin','hr','employee','superadmin')`, default `employee` | `backend/app/models/users.js`, `controller/auth/login.js` |
| `empPersonal` — employees (mobile app and Employee Portal) | `POST /api/app-login` → `POST /api/verify-otp`; or `POST /api/employee-portal/send-otp` → `.../verify-otp` | `AppAdmin` | `empPersonal.role` — free `STRING`, nullable (no enum) | `models/empPersonal.js`, `middleware/auth.js` |
| `interview_panel_users` — external/internal interviewers | `POST /api/panel-user-login` (password) or `POST /api/send-otp` → `POST /api/verify-otp-login` (mobile OTP) | `PanelUser` | constant `"panel_user"` (embedded in JWT/response, not a DB role) | `controller/recruitment/panel_user_auth.js`, `controller/auth/login.js`, `middleware/panelAuth.js` |
| Platform (SaaS operator) | `POST /api/superadmin/login` | `SuperAdmin` (re-uses `users` table, requires `role === 'superadmin'`) | `superadmin` | `routes/superadmin.js`, `middleware/auth.js` |

### 2.2 Role values observed in code

| Role value | Where it exists | How it is used | Status |
|---|---|---|---|
| `admin` | `users.role`; self-registration creates this role for the new tenant owner (`Companyregistration` in `controller/auth/register.js`) | Full tenant administration in the UI matrix; accepted by `Admin` guard | IMPLEMENTED |
| `hr` | `users.role` | HR modules in UI matrix; accepted by `Admin` guard | IMPLEMENTED |
| `superadmin` | `users.role` | Platform console (`/api/superadmin/*`); also accepted by `Admin` guard; tenant-level `superadmin` appears in UI matrix beside `admin` | IMPLEMENTED |
| `employee` | `users.role` (default) and the frontend `UserRole` type | `Admin` guard **also accepts** `users.role = employee` (allow-list is `admin, hr, superadmin, employee`). Whether production data contains `users` rows with this role is UNKNOWN. In the frontend it is labelled "employee portal users — not shown on Role Permission page". | IMPLEMENTED (guard) / UNKNOWN (data) |
| `manager` | `empPersonal.role` (free string); frontend `UserRole` | Server: approval and team-visibility branches in `appApi.js`; multi-branch assignment allowed (`MULTI_BRANCH_ROLES = ["director","manager"]` in `controller/tenant/empPersonal.js`). Frontend: in the permission matrix. | IMPLEMENTED |
| `director` | `empPersonal.role`; frontend `UserRole` | Same as manager plus **branch-wide** visibility (`Helper.isBranchAccessRole`) | IMPLEMENTED |
| `teamLeader` (a.k.a. `teamleader`, `team_leader`) | `empPersonal.role` (string compared case-insensitively in some places and case-sensitively in others) | "Team lead": may recommend leave, may view team data; reimbursement controller treats `teamleader` as an approver. **Not** in the frontend `UserRole` type or matrix. | PARTIALLY_IMPLEMENTED (inconsistent casing) |
| `project_manager` | `empPersonal.role` | Cannot approve leave (server returns 403 when `status == "approved"`); treated like team lead for visibility. Not in the frontend matrix. | PARTIALLY_IMPLEMENTED |
| `recruiter` | **Frontend only** (`UserRole` and matrix entries for Recruitment) | No backend reference to a `recruiter` role was found (`users.role` enum does not contain it) | PARTIALLY_IMPLEMENTED (UI-only; how a `recruiter` user is created/logged in: NEEDS_VERIFICATION) |
| `panel_user` | Constant for interview panel members | `PanelUser` guard (own interviews and own feedback only) | IMPLEMENTED |
| "Senior Accountant" | **Designation name**, not a role. Looked up via `designation.name` (case-insensitive) in `getTeamReimbursements` / `updateAppReimbursementStatus` | May view all branch reimbursements and may only set `recommended` | IMPLEMENTED (name-matching is brittle) |
| Expense "finance" staff | `expense_settings.financeEmployeeIds[]` (per-tenant list of employee IDs) | Approve at the `finance` level and record payments in the Expense workflow | IMPLEMENTED |
| Reporting manager / skip-level manager | Relationship `empPersonal.reportingPersonId` (and its parent), not a role | Used for expense, timesheet, performance and leave-visibility routing | IMPLEMENTED |

> **Important:** `manager`/`director` in the web admin UI come from the logged-in user's `role` stored in `localStorage.user`. The web login endpoint only reads `users` (enum without `manager`/`director`), so how those roles reach the web admin UI is **NEEDS_VERIFICATION** (possible DB column drift from the model enum, or the UI matrix being relevant only for stored custom permissions).

### 2.3 Mapping of roles to the four product surfaces

| Surface | Auth | Roles that can reach it |
|---|---|---|
| Admin / HR web app (`frontend/src/app/layout`, master, payroll, …) | `token` in `localStorage`, `AuthGuard` checks only presence of `token` | `users.role` ∈ admin, hr, superadmin (+ employee per guard allow-list) |
| Employee Portal (`/employee-portal/*`) and mobile app | `empPortalToken` / app `token`, `employeePortalGuard` checks only presence of `empPortalToken` | Any approved active `empPersonal` (role may be empty) |
| Interview panel (`/interviewer`, `get-my-interviews`, …) | `panelToken` | `interview_panel_users` |
| SuperAdmin console (`/superadmin/*`) | `superadminToken`, `superadmin.guard.ts` | `users.role = superadmin` |

---

## 3. Server-side guards and their role rules

Source: `backend/app/middleware/auth.js` and `panelAuth.js`.

| Guard | Identity table | Token column checked | Accepted roles | Sets on `req` |
|---|---|---|---|---|
| `Admin` | `users` | `users.token` must equal presented token | `admin`, `hr`, `superadmin`, `employee` | `req.users {id, name, role, tenantId, branchId ← header "branchid"}` |
| `WebcamAdmin` | `users` | `users.webcamtoken` (30-day token) | same four | `req.users` (token field = webcamtoken) |
| `SuperAdmin` | `users` | `users.token` | `superadmin` only | `req.users` with `branchId: null` |
| `AppAdmin` | `empPersonal` | `empPersonal.token` (mobile) **or** `empPersonal.webToken` (portal) | **no role check** (any `empPersonal` with a matching token) | `req.users {id, name, reportingPersonId, shift_id, tenantId, branchId, branchIds, role, loginSource}` — tenant/branch/role come from the DB row, **not** from request headers |
| `PanelUser` | `interview_panel_users` | `token` | n/a | `req.panelUser {id, email, name, tenantId, branchId}` |
| *(none)* | — | — | public | see `AUTHENTICATION_AND_SECURITY.md` §10 |

What the guards do **not** check (verified by reading the code): user `status` (active/inactive) after login, tenant `status`, subscription validity, role-per-route, reporting-line.

---

## 4. Frontend permission model

### 4.1 Mechanism

| Element | Behaviour | Evidence |
|---|---|---|
| `DEFAULT_PERMISSIONS` | Array of sections/children, each with a `roles: UserRole[]` list | `permission.service.ts` |
| `PermissionService.can(key, role)` | 1) if `custom_user_permissions` exists in `localStorage`, use it; 2) else use role matrix from `localStorage.app_role_permissions` or defaults; **unknown key → `true`** (allow) | `permission.service.ts` |
| Version bump | `PERM_VERSION = 'v10'`; on mismatch the saved role matrix is discarded | `permission.service.ts` |
| `PermissionGuard` | Reads `permKey` from route data and `role` from `localStorage.user.role` (default `'hr'` when missing/unparseable). If denied → toast + redirect. | `permission.guard.ts` |
| `AuthGuard` | Only checks `localStorage.token` exists | `auth.guard.ts` |
| `employeePortalGuard` | Only checks `localStorage.empPortalToken` exists | `employee-portal.guard.ts` |
| Role Permissions screen | Edits are written by `PermissionService.save()` to `localStorage` — per browser, not per tenant | `master/role-permission/role-permission.component.ts` |
| User Permissions screen | Calls `/get-tenant-users`, `/save-user-permission`, `/get-user-permission`, `/delete-user-permission` (all `Admin` guard). Saving invalidates that user's `users.token` (forces re-login). Audited as `USER_PERMISSION_*`. | `controller/tenant/userPermission.js` |

### 4.2 Server vs UI enforcement gap (key finding)

| # | Gap | Evidence | Impact |
|---|---|---|---|
| 1 | No server check that the caller's role matches the module (e.g. `hr` calling Master/Settings routes, or `employee`-role `users` calling payroll routes) | Most HR routes use the plain `Admin` guard; its role allow-list (`admin, hr, superadmin, employee`) is identical for every route. Exception: `expense`, `asset`, `project`, `performance` HR controllers enforce `HR_ROLES` in-handler | UI matrix can be bypassed by calling the API directly (except those four modules, and even there `hr` = `admin`) |
| 2 | Role matrix is client-editable and client-stored | `localStorage.app_role_permissions`, `custom_user_permissions`, and `localStorage.user.role` are all read by the guard | Trivially tampered in the browser |
| 3 | `PermissionService.can()` returns `true` for unknown keys | `checkInSections` fallthrough | New screens are open by default |
| 4 | `PermissionGuard` defaults to role `hr` when `user.role` is missing | `permission.guard.ts` | Fail-open |
| 5 | User-specific permissions are saved server-side but never evaluated server-side | `userPermission.js` only stores/returns JSON | Not an access-control layer |
| 6 | `/save-user-permission` itself has no role check — any `Admin`-guard user (incl. `hr`) can change another user's permission JSON; the lookup `UserPermission.findOne({ where: { userId } })` is not tenant-scoped (create/delete use `tenantId`) | `userPermission.js` | Privilege-management weakness |
| 7 | `AppAdmin` has no role gate at all; role-based behaviour exists only inside individual handlers | `middleware/auth.js`, `appApi.js` | Authority logic is scattered and inconsistent |

**Status:** server-side RBAC matching the UI matrix = **NOT_FOUND** (only the `HR_ROLES` coarse check in four modules, **PARTIALLY_IMPLEMENTED**).

---

## 5. Modules and who can reach them

### 5.1 HR/Admin API families (guard `Admin`)

| Module | Representative routes (all registered under `/api`) | UI roles allowed (matrix) | Server role gate |
|---|---|---|---|
| Employee management | `/createEmp`, `/updateEmp`, `/deleteEmp`, `/getEmp`, `/get-emp-list`, `/approve-all-pending-emp`, `/assign-branches` | admin, superadmin, hr (+manager/director for view/leave) | none beyond guard |
| Attendance & shift | `/add-attendance`, `/update-attendance`, `/upload-attendance`, `/get-date-wise-attendance`, shift CRUD, holiday CRUD, `/pending-regularize-list`, `/update-status` | admin, superadmin, hr (+manager/director for read screens) | none beyond guard |
| Leave | `/apply-leave`, `/update-apply-leave-status`, `/assign-leave`, `/get-leave-ledger`, comp-off | admin, superadmin, hr, manager, director (leave screens) | none beyond guard |
| Payroll & compensation | `/generate-Salary`, `/generate-Salary-list`, `/revert-Salary`, `/setup-salary`, `/calculate-*`, arrears, appraisal | admin, superadmin, hr | none beyond guard |
| Expenses (HR side) | `/expense/*` (categories, rules, settings, claims, mark-paid) | admin, superadmin, hr (`exp.policies`: admin, superadmin) | **server `HR_ROLES` check** (admin/hr/superadmin) in `expense.js` |
| Assets (HR side) | `/asset/*` | admin, superadmin, hr | **server `HR_ROLES` check** in `asset.js` |
| Projects & timesheets (HR side) | `/project/*` | admin, superadmin, hr | **server `HR_ROLES` check** in `project.js` |
| Performance (HR side) | `/performance/*` (cycles, reviews, goals, reports) | admin, superadmin, hr | **server `HR_ROLES` check** in `performance.js` |
| Recruitment | `/createJobRequirement`, `/list-applications`, `/update-stage`, interview rounds, offer letters | admin, superadmin, hr, recruiter | none beyond guard |
| Documents / letters | `/hr-template-*`, `/save-letter-data`, `/generate-letter-pdf` | admin, superadmin, hr | none beyond guard |
| Master & Settings | `/createDepartment`, `/createBranch`, `/create-component`, `/save-app-config`, `/upload-handbook`, `/save-user-permission` … | admin, superadmin | none beyond guard |
| Audit | `POST /audit/list` (limited to 200 rows, tenant-scoped, branch-scoped when header present) | not in matrix | none beyond guard |
| AI Face / cameras | `/ai-face/*` | admin, superadmin, hr | none beyond guard |
| Reports | `/employee-report`, `/payroll-report`, `/salary-register-report`, late/tracking | see matrix | none beyond guard |

### 5.2 Employee-facing API families (guard `AppAdmin`)

| Module | Routes | Scope applied inside handler |
|---|---|---|
| Profile | `GET /get-Emp-Details`, `POST /update-app-emp` (whitelisted personal fields only) | own record (id from token) |
| Attendance | `/get-daily-attendance`, `/get-monthly-attendance`, `/mark-attendance`, `/team-attendances` | own record; team by role |
| Leave | `/apply-leaves`, `/get-emp-leave-list`, `/pending-leave-list`, `/update-apply-leaves-status`, `/status-wise-leave-list`, `/get-my-leave-history`, `/get-applied-leave-list`, `/UpComming-leave`, `/get-app-leave-type-dd`, `/comp-off-list` | see §6–§8 |
| Regularization (employee side) | `/create-regularization`, `/regularization-list`, `/get-attendance-by-date` | own record |
| Payslip | `/get-app-bill-details`, `/print-bill` | own record |
| Reimbursement (legacy) | `/add-app-reimbursement`, `/reimbursement-list`, `/team-reimbursements`, `/update-app-reimbursement-status` | own; team by role/designation |
| Expense workflow | `/expense/my/*` | own; approver by reporting line / finance list |
| Assets | `/asset/my/*` | own allocations |
| Timesheets | `/project/my/*` | own; approver = `timesheet.approverId` |
| Performance | `/performance/my/*` | own review; manager = `managerId`; approver by cycle levels |
| Documents | `/getAppDocument`, `/get-emp-letter-docs`, `/get-app-handbook`, `/get-app-insurance-policy`, `/getAppInsuranceDocs` | own / tenant |
| Notifications | `GET /notification`, `/mark-notifications-read` | role-scoped (teamLeader/manager/director views) |

### 5.3 Other families

| Family | Guard | Notes |
|---|---|---|
| `/superadmin/*` | `SuperAdmin` (except `login`, `forgot-password`, `reset-password`) | Platform operator: plans, tenants, users, analytics, landing content |
| Interview panel | `PanelUser` for `panel-user-logout`, `get-my-interviews`, `panel-save-feedback`, `panel-feedback-detail` | Own interviews only |
| Public | none | `/public/*`, `/submit-application`, `/public-job-posting`, `/RegisterAppEmp`, `/company-register`, … |

---

## 6. Data visibility

| Persona | What they can see (as implemented) | Evidence | Status |
|---|---|---|---|
| Employee (`empPersonal`, no/other role) | Own profile, attendance, leaves, payslips, assets, expenses, timesheets, performance, documents, notifications; **plus** `/get-employee-monthly-attendance` which accepts any `employeeId` in the same tenant | `appApi.js` (`getEmployeeMonthlyAttendance` takes `employeeId` from the body and only checks tenant + active) | PARTIALLY_IMPLEMENTED — peer attendance readable by any employee in the tenant |
| Team leader / project manager | Pending leaves of direct/indirect subordinates via `Helper.getAllSubordinates`; notifications/leaves scoped to team; **cannot approve leave** (can recommend/reject) | `getPendingLeaveList`, `AppupdatedApplyLeaveStatus` | IMPLEMENTED |
| Manager | Subordinate tree (reporting-person hierarchy) in own branch; if `branchIds` explicitly assigned, **all employees in those branches** | `Helper.isBranchAccessRole` (`manager` only when `hasExplicitBranchIds`) | IMPLEMENTED |
| Director | Branch-wide: all active employees in accessible branches (`branchIds` or home branch) | `Helper.isBranchAccessRole`, `resolveBranchScope` | IMPLEMENTED |
| HR / Admin web (`users`) | Everything in the tenant, filtered to the branch supplied in the `branchid` header | Admin controllers use `req.users.tenantId` + `req.users.branchId` | PARTIALLY_IMPLEMENTED (branch header unvalidated) |
| Superadmin | Cross-tenant platform data (tenants, plans, users, analytics, contact messages) | `controller/superadmin/superadmin.js` | IMPLEMENTED |
| Interview panel user | Own interviews and own feedback only | `panelAuth.js`, `get-my-interviews` | IMPLEMENTED |
| Senior Accountant (designation) | All reimbursement rows in own branch | `getTeamReimbursements` | IMPLEMENTED |
| Expense finance staff | All expense claims awaiting payment in tenant (payables, excluding own) | `expensePortal.js` | IMPLEMENTED |

Salary data: employees see only their own bill (`get-app-bill-details`, `print-bill` filter on `req.users.id`). Salary generated PDFs are stored under `backend/uploads/pdfs/payslip_<empCode>_<month>_<year>.pdf` and are served by a static route without authentication (see `AUTHENTICATION_AND_SECURITY.md`).

---

## 7. Tenant and branch restrictions

| Aspect | Behaviour | Status |
|---|---|---|
| Tenant key | UUID `tenantId` on `users`, `empPersonal` and business tables | IMPLEMENTED |
| Where tenant comes from | `Admin`/`SuperAdmin`/`WebcamAdmin`: `users.tenantId` (DB). `AppAdmin`: `empPersonal.tenantId` (DB). **Never from a header or body for authenticated routes.** | IMPLEMENTED |
| Tenant filter in queries | Manual per controller. **Counter-examples** (lookup by primary key only, no tenant filter): `updateApplicationStage` (`Application.findOne({ where: { id } })`), `AppupdatedApplyLeaveStatus` (`leave_application.findOne({ where: { id } })`), `revertSalary` (`bill.findOne/destroy({ where: { id } })`), `updateRegularizationStatus` (filtered by `branchId` only). | PARTIALLY_IMPLEMENTED |
| Branch for `Admin` | `req.users.branchId = request header "branchid"` | IMPLEMENTED — **not validated** against assigned branches |
| Branch for `AppAdmin` | From `empPersonal.branchId`; `branchIds` for director / manager multi-branch | IMPLEMENTED |
| Multi-branch assignment | Only roles `director` and `manager` may have more than one branch (`multiBranchError`) | IMPLEMENTED |
| Branch geofence | `branch.latitude/longitude/range` enforced in `/mark-attendance` for non-field employees (`isLocation` bypass) | IMPLEMENTED |
| Login scoping | Web login requires `companyCode` → active tenant. Employee Portal OTP requires `companyCode`. **Mobile `/app-login` is by mobile only** (not tenant-scoped). | PARTIALLY_IMPLEMENTED |
| Subscription seats | `createEmp` enforces seat count when an active subscription exists | IMPLEMENTED (create path only) |
| Tenant/branch headers in AI services | The external AI chat/insights client sends `X-Tenant-Id` from `localStorage`; service not in repo | UNKNOWN |

---

## 8. Approval authority matrix (as implemented)

| Workflow | Who submits | Who can approve / act | Hierarchy verified server-side? | API (guard) | Evidence | Status |
|---|---|---|---|---|---|---|
| Employee registration (self) | Candidate, public | HR/Admin via Pending Employee List | Not applicable | `POST /RegisterAppEmp` (none) → `POST /updateEmp` or `POST /approve-all-pending-emp` (`Admin`) | `empPersonal.js` | IMPLEMENTED |
| Leave (employee portal) | Employee (`/apply-leaves`) — `employeeId` taken from **body** | `/update-apply-leaves-status` (`AppAdmin`): any employee token. Blocks only `teamLeader`/`project_manager` from `approved`. UI exposes approve to roles containing `director`/`manager`; team lead sees "recommend". | **No** reporting-line check; lookup not tenant-scoped | `AppAdmin` | `appApi.js` `AppapplyForLeave`, `AppupdatedApplyLeaveStatus`; `employee-portal.service.ts` | PARTIALLY_IMPLEMENTED |
| Leave (HR web) | HR (`/apply-leave` for an employee) | HR/Admin (`/update-apply-leave-status`) | n/a | `Admin` | `leave.js` | IMPLEMENTED |
| Leave cancel (self) | Employee | Employee sets `self_declined` through the same status endpoint | Status values are **not validated** server-side | `AppAdmin` | `employee-portal.service.ts` line using `self_declined` | PARTIALLY_IMPLEMENTED |
| Attendance regularization | Employee (`/create-regularization`, 2-working-day window) | **HR/Admin web only** (`/pending-regularize-list`, `/update-status`) — managers in the portal cannot approve | Filter by `branchId` from header; `status` value not whitelisted | `Admin` | `appApi.js`, `routes/app.js` | IMPLEMENTED (HR-only) |
| Reimbursement (legacy) | Employee (`/add-app-reimbursement`) | `manager`, `director`, `teamleader` may set `approved`/`rejected`; "Senior Accountant" may only `recommended` | Branch-scoped; **not** reporting-line scoped (any manager in the branch) | `AppAdmin` | `appApi.js` `updateAppReimbursementStatus` | IMPLEMENTED |
| Expense claim (workflow) | Employee (`/expense/my/submit`) | Levels in `expense_claims.approvalLevels`: `manager` → `skip_manager` → `hr` → `finance`. Employee portal can act on `manager`, `skip_manager`, `finance`; `hr` level is acted on by HR (`/expense/claim/act`). Nobody approves own claim. Finance pays (`mark-paid`), not own claim. | **Yes** (reporting line + finance list) | `AppAdmin` / `Admin` | `helper/expense.js` `portalCanAct`, `expensePortal.js` | IMPLEMENTED |
| Asset allocation / return | HR allocates (`/asset/allocate`), receives return (`/asset/return`) | Employee acknowledges / disputes / requests return (own allocations only) | **Yes** (own `employeeId`) | `Admin` / `AppAdmin` | `assetPortal.js`, `helper/assets.js` | IMPLEMENTED |
| Timesheet week | Employee (`/project/my/submit`) | `timesheet.approverId` (manager or HR); not own | **Yes** | `AppAdmin` / `Admin` (`/project/timesheet/act`) | `projectPortal.js` | IMPLEMENTED |
| Performance review | Employee self-review; manager review | Reporting manager; skip-level approvers by cycle `approvalLevels`; HR can approve/skip | **Yes** (`managerId`, `currentApprover`) | `AppAdmin` / `Admin` | `performancePortal.js`, `helper/performance.js` | IMPLEMENTED |
| Payroll generation / revert | HR (`/generate-Salary`, `/revert-Salary`) | HR/Admin | n/a (no maker-checker) | `Admin` | `salary.js` | IMPLEMENTED (no approval step) |
| Arrears | HR (`/create-arrear`, `/submit-arrear`) | `/approve-arrear`, `/reject-arrear` (`Admin`) | role not enforced | `Admin` | `routes/arrear.js` | IMPLEMENTED |
| Recruitment stage changes | HR/recruiter | `/update-stage` (any stage string accepted), interview feedback auto-moves stage | none | `Admin` / `PanelUser` | `candidate.js`, `interview.js` | PARTIALLY_IMPLEMENTED |
| Contractual attendance day | HR | `/contractual-approve` | none | `Admin` | `routes/attendance.js` | IMPLEMENTED |
| Comp-off | Employee requests via leave; HR generates/approves (`/generate-comp-off-leave`, `/approve-comp-off-leave`, `/create-manually-comp-off`) | HR/Admin | none | `Admin` | `leave.js`, `attendance.js` | IMPLEMENTED |

---

## 9. Role-vs-module matrix (frontend `DEFAULT_PERMISSIONS`, UI-only)

`Y` = role listed for the key; `-` = not listed. **These flags are not enforced by the API.** The `employee` role is not part of the matrix ("employee portal users — not shown on Role Permission page"); employee-portal screens are gated by role string checks inside components and by `AppAdmin` data scoping.

Source: `frontend/src/app/services/permission.service.ts`, `PERM_VERSION = 'v10'`. Columns: admin, superadmin, hr, manager, director, recruiter.

| Key | Label | admin | superadmin | hr | manager | director | recruiter |
|---|---|---|---|---|---|---|---|
| `dashboard` | Dashboard | Y | Y | Y | Y | Y | - |
| `emp-mgmt` | Employee Management | Y | Y | Y | Y | Y | - |
| `emp-mgmt.add` | Add Employee | Y | Y | Y | - | - | - |
| `emp-mgmt.leave` | Apply Leave | Y | Y | Y | Y | Y | - |
| `emp-mgmt.letters` | All Letters | Y | Y | Y | - | - | - |
| `emp-mgmt.insurance` | Insurance Documents | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.basic` | Profile: Basic | Y | Y | Y | Y | Y | - |
| `emp-mgmt.profile.document` | Profile: Document | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.insurance` | Profile: Insurance | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.workExp` | Profile: Work Experience | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.bank` | Profile: Bank Account | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.relieving` | Profile: Relieving Letter | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.nda` | Profile: NDA | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.offer` | Profile: Offer Letter | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.service` | Profile: Service Agreement | Y | Y | Y | - | - | - |
| `emp-mgmt.profile.appointment` | Profile: Appointment Letter | Y | Y | Y | - | - | - |
| `attendance` | Attendance & Shift | Y | Y | Y | Y | Y | - |
| `att.shift` | Shift Master | Y | Y | Y | - | - | - |
| `att.datewise` | Date Wise Attendance | Y | Y | Y | Y | Y | - |
| `att.holiday` | Holiday | Y | Y | Y | Y | Y | - |
| `att.logs` | Attendance Logs | Y | Y | Y | Y | Y | - |
| `att.leaves` | Leaves | Y | Y | Y | Y | Y | - |
| `att.leaveLedger` | Leave Ledger | Y | Y | Y | Y | Y | - |
| `att.upload` | Upload Attendance | Y | Y | Y | - | - | - |
| `att.regularize` | Regularize | Y | Y | Y | - | - | - |
| `att.weekend` | Weekend Employee List | Y | Y | Y | - | - | - |
| `att.compoff` | Add Comp Off | Y | Y | Y | - | - | - |
| `att.contractual` | Contractual Approval | Y | Y | Y | - | - | - |
| `att.aiFace` | AI Face Recognition | Y | Y | Y | - | - | - |
| `att.aiCameras` | Camera Management | Y | Y | Y | - | - | - |
| `att.aiEnroll` | Face Enrollment | Y | Y | Y | - | - | - |
| `att.aiLogs` | Recognition Logs | Y | Y | Y | - | - | - |
| `payroll` | Payroll & Compensation | Y | Y | Y | - | - | - |
| `pay.generate` | Generate Salary | Y | Y | Y | - | - | - |
| `pay.list` | Generated Salary List | Y | Y | Y | - | - | - |
| `pay.deduction` | Deduction Summary | Y | Y | Y | - | - | - |
| `pay.reimburse` | Reimbursement | Y | Y | Y | - | - | - |
| `pay.appraisal` | Employee Appraisal | Y | Y | Y | - | - | - |
| `pay.appraisalList` | Appraisal List | Y | Y | Y | - | - | - |
| `pay.arrear` | Arrear Management | Y | Y | Y | - | - | - |
| `assets` | Assets | Y | Y | Y | - | - | - |
| `asset.dashboard` | Asset Dashboard | Y | Y | Y | - | - | - |
| `asset.inventory` | Inventory | Y | Y | Y | - | - | - |
| `asset.categories` | Asset Categories | Y | Y | Y | - | - | - |
| `asset.clearance` | Exit Clearance | Y | Y | Y | - | - | - |
| `projects` | Projects & Timesheets | Y | Y | Y | - | - | - |
| `proj.projects` | Projects | Y | Y | Y | - | - | - |
| `proj.clients` | Clients | Y | Y | Y | - | - | - |
| `proj.timesheets` | Timesheets | Y | Y | Y | - | - | - |
| `proj.reports` | Project Reports | Y | Y | Y | - | - | - |
| `expenses` | Expenses | Y | Y | Y | - | - | - |
| `exp.dashboard` | Expense Dashboard | Y | Y | Y | - | - | - |
| `exp.claims` | Expense Claims | Y | Y | Y | - | - | - |
| `exp.policies` | Expense Policies | Y | Y | - | - | - | - |
| `performance` | Performance | Y | Y | Y | - | - | - |
| `perf.dashboard` | Dashboard & Analytics | Y | Y | Y | - | - | - |
| `perf.cycles` | Appraisal Cycles | Y | Y | Y | - | - | - |
| `perf.reviews` | Reviews & Goals | Y | Y | Y | - | - | - |
| `perf.history` | Employee History | Y | Y | Y | - | - | - |
| `reports` | Reports | Y | Y | Y | Y | Y | - |
| `rep.employee` | Employee Report | Y | Y | Y | - | - | - |
| `rep.payroll` | Payroll Report | Y | Y | Y | - | - | - |
| `rep.salaryRegister` | Salary Register | Y | Y | Y | - | - | - |
| `rep.late` | Late Arrival Report | Y | Y | Y | Y | Y | - |
| `rep.tracking` | Tracking Report | Y | Y | Y | Y | Y | - |
| `master` | Master | Y | Y | - | - | - | - |
| `master.designation` | Designation Master | Y | Y | - | - | - | - |
| `master.department` | Department Master | Y | Y | - | - | - | - |
| `master.emptype` | Employment Type | Y | Y | - | - | - | - |
| `master.docs` | Documents | Y | Y | - | - | - | - |
| `master.holidaytype` | Holiday Types | Y | Y | - | - | - | - |
| `master.salary` | Salary Component | Y | Y | - | - | - | - |
| `master.payslip` | Pay Slip Setup | Y | Y | - | - | - | - |
| `master.branch` | Branch | Y | Y | - | - | - | - |
| `master.insurancePolicy` | Insurance Policy | Y | Y | Y | - | - | - |
| `setting` | Setting | Y | Y | - | - | - | - |
| `set.attmaster` | Attendance Master | Y | Y | - | - | - | - |
| `set.currency` | Currency | Y | Y | - | - | - | - |
| `set.prefix` | Company Prefix | Y | Y | - | - | - | - |
| `set.brand` | Brand & Colors | Y | Y | - | - | - | - |
| `set.handbook` | Employee Handbook | Y | Y | - | - | - | - |
| `set.appconfig` | App Config | Y | Y | - | - | - | - |
| `set.roleperm` | Role Permissions | Y | Y | - | - | - | - |
| `set.userperm` | User Permissions | Y | Y | - | - | - | - |
| `set.sidebaraccess` | My Sidebar Access | Y | Y | Y | Y | Y | Y |
| `ai-insights` | AI Insights | Y | Y | Y | Y | Y | - |
| `ai.attendance` | Attendance Analytics | Y | Y | Y | Y | Y | - |
| `ai.payroll` | Payroll Verification | Y | Y | Y | - | - | - |
| `ai.leave` | Leave Recommendations | Y | Y | Y | Y | Y | - |
| `ai.performance` | Performance Insights | Y | Y | Y | Y | Y | - |
| `ai.attrition` | Attrition Prediction | Y | Y | Y | Y | Y | - |
| `ai.recruitment` | Recruitment Assistant | Y | Y | Y | - | - | Y |
| `tracking` | Location Tracking | Y | Y | Y | Y | Y | - |
| `recruitment` | Recruitment | Y | Y | Y | - | - | Y |
| `rec.dashboard` | Recruitment Dashboard | Y | Y | Y | - | - | Y |
| `rec-analysis` | Recruitment Analysis | Y | Y | Y | - | - | Y |
| `rec.analysis` | Job Requirement Analysis | Y | Y | Y | - | - | Y |
| `rec.posting` | Job Posting & Sourcing | Y | Y | Y | - | - | Y |
| `rec-candidates` | Candidate Management | Y | Y | Y | - | - | Y |
| `rec.candidates` | Candidate Application | Y | Y | Y | - | - | Y |
| `rec.offered` | Offered Candidate List | Y | Y | Y | - | - | Y |
| `rec.offerletter` | Generate Offer Letter | Y | Y | Y | - | - | - |
| `rec-interview` | Interview Management | Y | Y | Y | - | - | Y |
| `rec.user` | Add Interview User | Y | Y | Y | - | - | - |
| `rec-master` | Recruitment Master | Y | Y | - | - | - | - |
| `rec.master.round` | Interview Round | Y | Y | - | - | - | - |
| `rec.master.roundtype` | Round Type | Y | Y | - | - | - | - |
| `rec.master.department` | Recruitment Department | Y | Y | - | - | - | - |
| `rec.master.designation` | Recruitment Designation | Y | Y | - | - | - | - |

Notes on the matrix:
- `manager` and `director` have identical columns in the default matrix.
- `hr` is excluded from `master`/`setting` (except `master.insurancePolicy`) and from `exp.policies` in the UI only; the API has no such restriction.
- `recruiter` is limited to Recruitment, `ai.recruitment` and `set.sidebaraccess` in the UI matrix.
- `teamLeader`, `project_manager`, `panel_user`, and `employee` are **not** columns in the matrix.

---

## 10. Observations to carry into any AI assistant design

1. **The API will not stop an out-of-role action** (e.g., an employee token approving someone's leave, or a manager approving a peer's reimbursement). Any assistant layer must enforce role, reporting line and ownership itself (see `EMPLOYEE_AI_ASSISTANT_CAPABILITIES.md`).
2. **Ownership is only partially enforced:** `apply-leaves` accepts `employeeId` from the request body; `get-employee-monthly-attendance` accepts `employeeId`; `update-apply-leaves-status` does not verify the approver's relationship to the applicant.
3. **Role strings are inconsistent** (`teamLeader` vs `teamleader` vs `team_leader`; `Senior Accountant` by designation text). Normalize before use.
4. **Regularization approval is HR-web only**; the employee portal cannot approve regularizations for managers.
5. External AI endpoints (`environment.chatApiUrl`, `environment.aiHrmsApiUrl`) identify the user from client-sent `employee_id` and `X-Tenant-Id`; no bearer token is attached by those client calls. The server side of those services is **NOT_FOUND** in this repository.

---

## 11. Open items (NEEDS_VERIFICATION / UNKNOWN)

| # | Item | Status |
|---|---|---|
| 1 | Whether `users` rows with `manager`/`director`/`recruiter`/`employee` roles exist in production and how they log in to the web UI | NEEDS_VERIFICATION |
| 2 | Actual DB column type for `users.role` (model enum vs database) | NEEDS_VERIFICATION |
| 3 | Canonical `empPersonal.role` vocabulary (free string; observed: `manager`, `director`, `teamLeader`/`teamleader`, `project_manager`, `hr`, `employee`) | NEEDS_VERIFICATION |
| 4 | Whether production uses `branchIds` for managers (affects branch-wide visibility) | UNKNOWN |
| 5 | Server of the AI chat / AI insights services and its authorization | NOT_FOUND in repo |
| 6 | `API_CATALOG.md` lists 531 unique endpoints; re-scan of active (non-commented) registrations in `backend/app/routes/*.js` (excluding `app_6_10_2026.js`) gives **527**. The four extra catalog rows are routes that are commented out in code: `POST /api/team-leave-list`, `POST /api/director-leave-list` (`app.js`), `POST /api/get-app-applied-leaves` (`leave.js`), `POST /api/updateSalarySetUp` (`basic.js`). Treat those four as **not registered**. | NEEDS_VERIFICATION (runtime) |
