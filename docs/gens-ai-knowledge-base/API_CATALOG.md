# DOCUMENT 03 — API_CATALOG

> Generated from route registration in `backend/app/routes/*.js` (excluding backup `app_6_10_2026.js`).
> Mount prefix: every route file is loaded with `app.use("/api", router)` in `backend/server.js`.
> **Verification status:** routes are **REGISTERED**. Runtime behaviour is **NEEDS_VERIFICATION** unless a deeper controller inspection is cited elsewhere in this knowledge base.
> **Count:** 531 unique method+path combinations from active route files.
> Duplicate registrations inside `app.js`: `POST /pending-leave-list`, `POST /status-wise-leave-list` (first handler wins).
> Backup file `app_6_10_2026.js` also mounts under `/api` but is a subset of `app.js` paths — treat as **outdated / risk of shadowing depending on filesystem order**.

## Conventions

- Typical response envelope via `Helper.response(status, message, data, res, httpCode)` in `backend/app/helper/helper.js`.
- Auth header: `Authorization: Bearer <token>`.
- Branch header (Admin / WebcamAdmin): `branchid` / `branchId` (client-supplied; not validated against assigned branches).
- Most business endpoints use **POST** even for reads.
- Errors often return HTTP 200 with `status: false` or `status: "expired"`.
- Server-side RBAC: **NOT enforced per route** beyond the auth guard role allow-list. UI permissions live in frontend `permission.service.ts`.
- Detailed request/response schemas are included in **Critical employee-facing APIs** below only where controllers were inspected. All other endpoints: request body = **UNKNOWN / NEEDS_VERIFICATION** from route layer alone.

## Auth guards (quick reference)

| Guard | Source | Identity table | Notes |
|---|---|---|---|
| `Admin` | `backend/app/middleware/auth.js` | `users` | Roles: admin, hr, superadmin, employee. Single-session via `users.token`. |
| `AppAdmin` | same | `empPersonal` | Mobile `token` or web `webToken`. Employee portal / mobile app. |
| `WebcamAdmin` | same | `users` | Uses `webcamtoken` (longer-lived). |
| `SuperAdmin` | same | `users` | Requires `role === superadmin`. |
| `PanelUser` | `backend/app/middleware/panelAuth.js` | `interview_panel_users` | Interview panel. |
| none | — | — | Public / OTP / login endpoints. |

## Endpoint inventory by route file


### `backend/app/routes/aiFace.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/ai-face/health` | Admin | `ctrl.serviceHealth` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/ai-face/health` | Admin | `ctrl.serviceHealth` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/enroll/:employeeId` | Admin | `10` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/employee/:employeeId` | Admin | `ctrl.getEmployeeFaces` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/ai-face/employee/:employeeId` | Admin | `ctrl.getEmployeeFaces` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| DELETE | `/api/ai-face/employee/:employeeId` | Admin | `ctrl.deactivateEmployeeFaces` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/employee/:employeeId/deactivate` | Admin | `ctrl.deactivateEmployeeFaces` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/enrolled-list` | Admin | `ctrl.listEnrolledEmployees` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/ai-face/cameras` | Admin | `ctrl.listCameras` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras` | Admin | `ctrl.createCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/list` | Admin | `ctrl.listCameras` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| PUT | `/api/ai-face/cameras/:id` | Admin | `ctrl.updateCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/update` | Admin | `ctrl.updateCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/delete` | Admin | `ctrl.deleteCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| DELETE | `/api/ai-face/cameras/:id` | Admin | `ctrl.deleteCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/test` | Admin | `ctrl.testCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/preview/start` | Admin | `ctrl.previewStart` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/preview` | Admin | `ctrl.previewCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/preview/stop` | Admin | `ctrl.previewStop` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/start` | Admin | `ctrl.startCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/cameras/:id/stop` | Admin | `ctrl.stopCamera` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/recognition-logs` | Admin | `ctrl.recognitionLogs` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/ai-face/recognition-logs` | Admin | `ctrl.recognitionLogs` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/unknown-faces` | Admin | `res` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/dashboard` | Admin | `ctrl.dashboard` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/ai-face/dashboard` | Admin | `ctrl.dashboard` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/config` | Admin | `ctrl.getConfig` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/config/update` | Admin | `ctrl.updateConfig` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/internal/punch` | none | `ctrl.internalPunch` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/ai-face/internal/unknown` | none | `ctrl.internalUnknown` | ../controller/tenant/aiFace | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/allowance.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createAllowance` | Admin | `createAllowance` | ../controller/tenant/allowance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getAllowance` | Admin | `getAllowance` | ../controller/tenant/allowance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateAllowance` | Admin | `updateAllowance` | ../controller/tenant/allowance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteAllowance` | Admin | `deleteAllowance` | ../controller/tenant/allowance | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/app.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| GET | `/api/get-Emp-Details` | AppAdmin | `EmployeeDetails` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/get-emp-app-config` | AppAdmin | `getEmpAppConfig` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-emp-app-config` | AppAdmin | `getEmpAppConfig` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-daily-attendance` | AppAdmin | `getDailyAttendance` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-monthly-attendance` | AppAdmin | `getAttendance` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-employee-monthly-attendance` | AppAdmin | `getEmployeeMonthlyAttendance` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/emp-by-department` | AppAdmin | `employeeByDepartment` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/team-attendances` | AppAdmin | `TeamsAttendance` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/team-attendances` | AppAdmin | `TeamsAttendance` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/apply-leaves` | AppAdmin | `AppapplyForLeave` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-apply-leaves-status` | AppAdmin | `AppupdatedApplyLeaveStatus` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-emp-leave-list` | AppAdmin | `EmployeeLeaveList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/status-wise-leave-list` | AppAdmin | `statusWiseLeaveList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-applied-leave-list` | AppAdmin | `getAppAppliedLeaves` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-my-leave-history` | AppAdmin | `getMyLeaveHistory` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/pending-leave-list` | AppAdmin | `getPendingLeaveList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-app-leave-type-dd` | AppAdmin | `getAppLeaveTypes` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/app-branch-dd` | AppAdmin | `branchDD` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/UpComming-leave` | AppAdmin | `upcomingLeave` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/team-leave-list` | AppAdmin | `TeamLeaderLeaveList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/director-leave-list` | AppAdmin | `DirectorLeaveList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/get-app-holidayList` | AppAdmin | `AppgetHolidayList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-app-bill-details` | AppAdmin | `AppgetBillDetails` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/print-bill` | AppAdmin | `PrintBill` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/notification` | AppAdmin | `notification` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/create-regularization` | AppAdmin | `applyRegularization` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/regularization-list` | AppAdmin | `getMyRegularizations` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-attendance-by-date` | AppAdmin | `getAttendanceByDateForRegularization` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/pending-regularize-list` | Admin | `getPendingApproverRequests` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-status` | Admin | `updateRegularizationStatus` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/track-location` | AppAdmin | `trackLocation` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/list-track-location` | AppAdmin | `listVistData` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/pinned-track-location` | AppAdmin | `PinnedtrackLocation` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-track-remark` | AppAdmin | `upload.any(` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/latest-location` | AppAdmin | `getLatestLocation` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/mark-attendance` | AppAdmin | `upload.any(` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/add-app-reimbursement` | AppAdmin | `excel_pdf_upload.array('images'` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/reimbursement-list` | AppAdmin | `reimbursementList` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/team-reimbursements` | AppAdmin | `getTeamReimbursements` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-app-reimbursement-status` | AppAdmin | `updateAppReimbursementStatus` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-app-emp` | AppAdmin | `updateAppEmp` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/get-emp-letter-docs` | AppAdmin | `getEmpLetterDocs` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-emp-letter-signature` | AppAdmin | `saveEmpLetterSignature` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-app-letter-pdfs` | AppAdmin | `generateAllLettersPdf` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/get-app-handbook` | AppAdmin | `getAppHandbook` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/get-app-insurance-policy` | AppAdmin | `getAppInsurancePolicy` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/uploadEmpImage` | Admin | `require('../middleware/faceUpload'` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getEmployeeUploadedImage` | Admin | `getEmployeeUploadedImage` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/mark-notifications-read` | AppAdmin | `markNotificationsRead` | ../controller/tenant/appApi; ../controller/tenant/tracking; ../controller/tenant/letter_data; ../controller/tenant/branch; ../controller/tenant/appConfig | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/appraisal.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/appraisal/employees` | Admin | `listAppraisalEmployees` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/detail` | Admin | `getAppraisalDetail` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/preview` | Admin | `previewAppraisal` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/apply` | Admin | `applyAppraisal` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/list` | Admin | `listAppliedAppraisals` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/record` | Admin | `getAppliedAppraisal` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/preview-edit` | Admin | `previewAppliedAppraisal` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/appraisal/update` | Admin | `updateAppliedAppraisal` | ../controller/tenant/appraisal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/arrear.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/get-employee-salary-history` | Admin | `getEmployeeSalaryHistory` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/calculate-arrear` | Admin | `calculateArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-arrear-salary-list` | Admin | `getArrearSalaryList` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/create-arrear` | Admin | `createArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/create-bulk-arrear` | Admin | `createBulkArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-arrear` | Admin | `updateArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-arrear-details` | Admin | `getArrearDetails` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-arrear-list` | Admin | `getArrearList` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-pending-arrears` | Admin | `getPendingArrears` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/submit-arrear` | Admin | `submitArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/approve-arrear` | Admin | `approveArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/reject-arrear` | Admin | `rejectArrear` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-approved-arrears-for-salary` | Admin | `getApprovedArrearsForSalary` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-arrear-status-history` | Admin | `getArrearStatusHistory` | ../controller/tenant/arrear | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/asset.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/asset/category/list` | Admin | `hr.listCategories` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/category/save` | Admin | `hr.saveCategory` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/list` | Admin | `hr.listAssets` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/register` | Admin | `hr.registerAssets` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/update` | Admin | `hr.updateAsset` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/detail` | Admin | `hr.assetDetail` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/status` | Admin | `hr.setStatus` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/scan` | Admin | `hr.scan` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/labels` | Admin | `hr.labels` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/allocate` | Admin | `hr.allocate` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/return` | Admin | `hr.receiveReturn` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/maintenance/open` | Admin | `hr.openMaintenance` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/maintenance/close` | Admin | `hr.closeMaintenance` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/employee` | Admin | `hr.employeeAssets` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/clearance` | Admin | `hr.clearanceReport` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/clearance/override` | Admin | `hr.logClearanceOverride` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/dashboard` | Admin | `hr.dashboard` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/my/list` | AppAdmin | `portal.myAssets` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/my/acknowledge` | AppAdmin | `portal.acknowledge` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/asset/my/request-return` | AppAdmin | `portal.requestReturn` | ../controller/tenant/asset; ../controller/tenant/assetPortal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/attendance.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/attendance-setting` | Admin | `attendanceMaster` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-attendance-setting` | Admin | `getAttendanceSettings` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-attendance-setting` | Admin | `updateAttendanceSettings` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-emp-attendance` | Admin | `getMonthlyAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-late-attendance` | Admin | `getLateAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-weekend-attendance` | Admin | `getWeekendAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-date-wise-attendance` | Admin | `getDateWiseAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-attendance-year` | Admin | `getAttendanceYears` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/add-attendance` | Admin | `addAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/upload-attendance` | Admin | `upload1.single("file"` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/upload-leave` | Admin | `upload1.single("file"` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/download` | Admin | `downloadAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-attendance` | Admin | `updateAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/bulk-update-attendance` | Admin | `BulkupdateAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-emp-attendance` | Admin | `updateempattendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-attendance` | Admin | `deleteAttendance` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/add-holiday` | Admin | `upload.any(` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-holidayList` | Admin | `getHolidayList` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-holiday` | Admin | `upload.any(` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-holiday` | Admin | `deleteHoliday` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/add-reimbursement` | Admin | `excel_pdf_upload.array('images'` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/fetchReimbursement` | Admin | `getReimbursement` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-reimbursement` | Admin | `upload.any(` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-reimbursement-status` | Admin | `updateReimbursementStatus` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-reimbursement` | Admin | `deleteReimbursement` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/create-manually-comp-off` | Admin | `CreateManuallyCompoff` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/list-manually-comp-off` | Admin | `listManuallyCompoff` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/contractual-attendance-list` | Admin | `getContractualAttendanceList` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/contractual-approve` | Admin | `approveContractualDay` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/contractual-employees` | Admin | `getContractualEmployees` | ../controller/tenant/attendance | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/audit.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/audit/list` | Admin | `listAuditLogs` | ../controller/tenant/audit | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/bank.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createBank` | Admin | `createBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getBank` | Admin | `getBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateBank` | Admin | `updateBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteBank` | Admin | `deleteBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createAppBank` | AppAdmin | `createAppBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getAppBank` | AppAdmin | `getAppBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateAppBank` | AppAdmin | `updateAppBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteAppBank` | AppAdmin | `deleteAppBankAccnt` | ../controller/tenant/bankAccnt | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/basic.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createBasic` | Admin | `createBasic` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getBasic` | Admin | `getBasic` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateBasic` | Admin | `updateBasic` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteBasic` | Admin | `deleteBasic` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getBasicSalaryEmployee` | Admin | `getBasicById` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateSalarySetUp` | Admin | `updateSalarySetUp` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createVariable` | Admin | `createVariable` | ../controller/tenant/basicSalary | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/candidate.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/public-job-posting` | none | `publicJobPosting` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/check-duplicate-application` | none | `checkDuplicateCandidateApplication` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/submit-application` | none | `uploadResume.single("resume"` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/list-applications` | Admin | `listCandidateApplications` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/admin-pipeline` | Admin | `adminPipeline` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/application-detail` | Admin | `applicationDetail` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-ats-score` | Admin | `saveAtsScore` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-stage` | Admin | `updateApplicationStage` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-application` | Admin | `updateCandidateApplication` | ../controller/recruitment/candidate | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/country.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/getCountry` | Admin | `getCountries` | ../controller/tenant/country; ../controller/tenant/city; ../controller/tenant/state | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getCity` | Admin | `getCity` | ../controller/tenant/country; ../controller/tenant/city; ../controller/tenant/state | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getState` | Admin | `getState` | ../controller/tenant/country; ../controller/tenant/city; ../controller/tenant/state | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getCountryDD` | none | `getCountryDD` | ../controller/tenant/country; ../controller/tenant/city; ../controller/tenant/state | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getStateDD` | Admin | `getStateDD` | ../controller/tenant/country; ../controller/tenant/city; ../controller/tenant/state | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getCityDD` | Admin | `getCityDD` | ../controller/tenant/country; ../controller/tenant/city; ../controller/tenant/state | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/deduction.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/create-deduction-master` | Admin | `createDeductionMaster` | ../controller/tenant/deductions | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-deduction-master` | Admin | `getDeductionMaster` | ../controller/tenant/deductions | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-deduction-master` | Admin | `updateDeductionMaster` | ../controller/tenant/deductions | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/department.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createDepartment` | Admin | `createDepartment` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getDepartments` | Admin | `getDepartments` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateDepartment` | Admin | `updateDepartment` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteDepartment` | Admin | `deleteDepartment` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/department-dd` | Admin | `departmentDD` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/designation-dd` | Admin | `getDesignationDD` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/add-prefix` | Admin | `createPrefix` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-prefix` | Admin | `getPrefixs` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-prefix` | Admin | `updatePrefix` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-prefix` | Admin | `deletePrefix` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/add-Currency` | Admin | `createCurrency` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-Currency` | Admin | `getCurrency` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-Currency` | Admin | `updateCurrency` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-Currency` | Admin | `deleteCurrency` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createBranch` | Admin | `upload.any(` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getBranch` | Admin | `getBranch` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateBranch` | Admin | `upload.any(` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteBranch` | Admin | `deleteBranch` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/branch-dd` | Admin | `branchDD` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/copy-branch-master-data` | Admin | `copyBranchMasterData` | ../controller/tenant/department; ../controller/tenant/prefix; ../controller/tenant/currency; ../controller/tenant/designation; ../controller/tenant/branch | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/designation.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createDesignation` | Admin | `createDesignation` | ../controller/tenant/designation | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getDesignations` | Admin | `getDesignation` | ../controller/tenant/designation | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateDesignation` | Admin | `updateDesignation` | ../controller/tenant/designation | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteDesignation` | Admin | `deleteDesignation` | ../controller/tenant/designation | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/document.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createDocument` | Admin | `upload.any(` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/editDocument` | Admin | `upload.any(` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getDocument` | Admin | `getDocument` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteDocument` | Admin | `deleteDocument` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createAppDocument` | AppAdmin | `upload.any(` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/editAppDocument` | AppAdmin | `upload.any(` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getAppDocument` | AppAdmin | `getAppDocument` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteAppDocument` | AppAdmin | `deleteAppDocument` | ../controller/tenant/document | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/documentTemplate.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/hr-template-variables` | Admin | `getVariableCatalog` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-create` | Admin | `createTemplate` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-update` | Admin | `updateTemplate` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-list` | Admin | `listTemplates` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-get` | Admin | `getTemplate` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-delete` | Admin | `deleteTemplate` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-preview` | Admin | `previewDocument` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-save-generated` | Admin | `saveGeneratedDocument` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-generated-list` | Admin | `listGeneratedDocuments` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/hr-template-generated-get` | Admin | `getGeneratedDocument` | ../controller/tenant/documentTemplate | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/documentType.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createDocumentType` | Admin | `addDocumentType` | ../controller/tenant/documentType | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getDocumentType` | Admin | `getDocumentTypes` | ../controller/tenant/documentType | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateDocumentType` | Admin | `updateDocumentType` | ../controller/tenant/documentType | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteDocumentType` | Admin | `deleteDocumentType` | ../controller/tenant/documentType | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getDocumentDD` | Admin | `getdocumentDD` | ../controller/tenant/documentType | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getAppDocumentDD` | AppAdmin | `getdocumentDD` | ../controller/tenant/documentType | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/emp.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createEmpType` | Admin | `createEmploymentType` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getEmpTypes` | Admin | `getEmploymentTypes` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/editEmpType` | Admin | `editEmploymentType` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteEmpType` | Admin | `deleteEmploymentType` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getEmpTypeDD` | Admin | `getEmpDD` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getVisitPlaceDD` | Admin | `getVisitPlace` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/getAppVisitPlaceDD` | AppAdmin | `getVisitPlace` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createHolidayType` | Admin | `createHolidayType` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getHolidayTypes` | Admin | `getHolidayTypes` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/editHolidayType` | Admin | `editHolidayType` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteHolidayType` | Admin | `deleteHolidayType` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getHolidayTypeDD` | Admin | `getHolidayTypeDD` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/dashboard` | Admin | `getDashboardData` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/dashboard-attendance-chart` | Admin | `getAttendanceChart` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/dashboard-attendance-by-department` | Admin | `getAttendanceByDepartment` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/today-attendance` | Admin | `todayAttendance` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/team-wise-attendance` | Admin | `getTeamwiseAttendance` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createSalaryOrder` | Admin | `createSalaryOrder` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getSalaryOrder` | Admin | `getSalaryOrder` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/editSalaryOrder` | Admin | `editSalaryOrder` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteSalaryOrder` | Admin | `deleteSalaryOrder` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/track-location-history` | Admin | `getLocationHistory` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/track-live-location-history` | Admin | `getliveLocationHistory` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/active-location-emp` | Admin | `getActiveLocationEmp` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-active-location` | Admin | `activeLocation` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/app-active-location-emp` | AppAdmin | `getappActiveLocationEmp` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/app-track-location-history` | AppAdmin | `getempLocationHistory` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/visit-report` | Admin | `getVisitReport` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/comp-off-list` | AppAdmin | `CompoffData` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-state-district` | none | `getStateDistrict` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/header-notifications` | Admin | `getHeaderNotifications` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/mark-header-notifications-read` | Admin | `markHeaderNotificationsRead` | ../controller/tenant/appApi; ../controller/tenant/dashboard; ../controller/tenant/employmentType; ../controller/tenant/empPersonal; ../controller/tenant/tracking; ../controller/tenant/headerNotifications | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/empPer.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createEmp` | Admin | `faceUpload.single('image'` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/RegisterAppEmp` | none | `faceUpload.single('profileImage'` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/check-tenant` | none | `CheckTenant` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getEmp` | Admin | `getEmp` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getEmpForwebcam` | WebcamAdmin | `getEmp` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateEmp` | Admin | `updateEmp` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteEmp` | Admin | `deleteEmp` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/uploadImage` | Admin | `faceUpload.single('profileImage'` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getUploadImage` | Admin | `getUploadedImage` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-emp-list` | Admin | `employeeList` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-ai-emp-list` | WebcamAdmin | `employeeList` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/app-emp-list` | Admin | `AppemployeeList` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/approve-all-pending-emp` | Admin | `approveAllPendingEmp` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/checkEmpByMobile` | Admin | `checkEmpByMobile` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/assign-branches` | Admin | `assignBranches` | ../controller/tenant/empPersonal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/employeeInsurance.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/upsertInsuranceDoc` | Admin | `upload.any(` | ../controller/tenant/employeeInsuranceDocument | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getInsuranceDocs` | Admin | `getInsuranceDocs` | ../controller/tenant/employeeInsuranceDocument | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteInsuranceDoc` | Admin | `deleteInsuranceDoc` | ../controller/tenant/employeeInsuranceDocument | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getAppInsuranceDocs` | AppAdmin | `getAppInsuranceDocs` | ../controller/tenant/employeeInsuranceDocument | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/getAppInsuranceDocs` | AppAdmin | `getAppInsuranceDocs` | ../controller/tenant/employeeInsuranceDocument | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/employeePortal.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/employee-portal/send-otp` | none | `sendEmployeePortalOtp` | ../controller/tenant/employeePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/employee-portal/verify-otp` | none | `verifyEmployeePortalOtp` | ../controller/tenant/employeePortal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/expense.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/expense/category/list` | Admin | `hr.listCategories` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/category/save` | Admin | `hr.saveCategory` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/rule/list` | Admin | `hr.listRules` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/rule/save` | Admin | `hr.saveRule` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/rule/delete` | Admin | `hr.deleteRule` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/settings` | Admin | `hr.getSettings` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/settings/save` | Admin | `hr.saveSettings` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/claim/list` | Admin | `hr.listClaims` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/claim/detail` | Admin | `hr.claimDetail` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/claim/act` | Admin | `hr.actOnClaim` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/claim/mark-paid` | Admin | `hr.markPaid` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/dashboard` | Admin | `hr.dashboard` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/report` | Admin | `hr.report` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/categories` | AppAdmin | `portal.categories` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/receipt` | AppAdmin | `excel_pdf_upload.single("file"` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/validate` | AppAdmin | `portal.validate` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/submit` | AppAdmin | `portal.submit` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/claims` | AppAdmin | `portal.myClaims` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/cancel` | AppAdmin | `portal.cancel` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/claim-detail` | AppAdmin | `portal.claimDetail` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/approvals` | AppAdmin | `portal.approvals` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/act` | AppAdmin | `portal.act` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/payables` | AppAdmin | `portal.payables` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/expense/my/mark-paid` | AppAdmin | `portal.markPaid` | ../controller/tenant/expense; ../controller/tenant/expensePortal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/interview.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createInterviewRound` | Admin | `createInterviewRound` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateInterviewRound` | Admin | `updateInterviewRound` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteInterviewRound` | Admin | `deleteInterviewRound` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/listInterviewRounds` | Admin | `listInterviewRounds` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/reorderInterviewRounds` | Admin | `reorderInterviewRounds` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createRoundType` | Admin | `createRoundType` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateRoundType` | Admin | `updateRoundType` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteRoundType` | Admin | `deleteRoundType` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/listRoundTypes` | Admin | `getRoundType` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/listRoundTypesDD` | Admin | `getRoundTypeDD` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/interview-schedule-detail` | Admin | `interviewScheduleDetail` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-interview-schedule` | Admin | `saveInterviewSchedule` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-interview-feedback` | Admin | `saveInterviewFeedback` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createInterviewPanelUser` | Admin | `createInterviewPanelUser` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateInterviewPanelUser` | Admin | `updateInterviewPanelUser` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/listInterviewPanelUsers` | Admin | `listInterviewPanelUsers` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteInterviewPanelUser` | Admin | `deleteInterviewPanelUser` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/assign-interviewer` | Admin | `assignInterviewer` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/send-interview-mail` | Admin | `sendInterviewMail` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/panel-user-login` | none | `panelUserLogin` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/panel-user-logout` | PanelUser | `panelUserLogout` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-my-interviews` | PanelUser | `getMyInterviews` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/panel-save-feedback` | PanelUser | `panelSaveFeedback` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/panel-feedback-detail` | PanelUser | `panelFeedbackDetail` | ../controller/recruitment/interview; ../controller/recruitment/round_type; ../controller/recruitment/panel_user_auth; ../controller/recruitment/interviewer_dashboard | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/job.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createJobRequirement` | Admin | `createJobRequirement` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateJobRequirement` | Admin | `updateJobRequirement` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteJobRequirement` | Admin | `deleteJobRequirement` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getJobRequirements` | Admin | `getJobRequirements` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/publishJob` | Admin | `publishJob` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-skills` | Admin | `getSkills` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/saveJobLink` | Admin | `saveJobLink` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-offer-letter` | Admin | `saveOfferLetter` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-offer-letters` | Admin | `getOfferLetters` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/check-duplicate-offer-letter` | Admin | `checkDuplicateOfferLetter` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generate-offer-letter-pdf` | Admin | `generateOfferLetterPdf` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-offer-letter-by-phone` | Admin | `getOfferLetterByPhone` | ../controller/recruitment/job | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/leave.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/create-leave` | Admin | `createLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-leaves` | Admin | `getLeaves` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-leaves` | Admin | `updatedLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-leaves` | Admin | `destroy` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/assign-leave` | Admin | `assignLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-assign-leave` | Admin | `updateAssignedLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-assign-leave` | Admin | `deleteAssignedLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-leave-type-dd` | Admin | `getLeaveTypes` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-leave-by-emp` | Admin | `getLeaveByEmployee` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-leave-ledger` | Admin | `getLeaveLedger` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/apply-leave` | Admin | `applyForLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-applied-leave` | Admin | `updateAppliedLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-apply-leave-status` | Admin | `updatedApplyLeaveStatus` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-applied-leaves` | Admin | `getAppliedLeaves` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generate-comp-off-leave` | Admin | `generateCompOffLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/approve-comp-off-leave` | Admin | `approveCompOffLeave` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-app-applied-leaves` | Admin | `getAppAppliedLeaves` | ../controller/tenant/leave | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/letter_data.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/save-letter-data` | Admin | `saveLetterData` | ../controller/tenant/letter_data | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-letter-data` | Admin | `getLetterData` | ../controller/tenant/letter_data | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-letter-stats` | Admin | `getLetterStats` | ../controller/tenant/letter_data | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generate-letter-pdf` | Admin | `generateLetterPdf` | ../controller/tenant/letter_data | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generate-all-letters-pdf` | Admin | `generateAllLettersPdf` | ../controller/tenant/letter_data | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/master.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/create-component` | Admin | `createComponent` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-component` | Admin | `updateComponent` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-component` | Admin | `listComponents` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-component` | Admin | `deleteComponent` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-brand-colors` | Admin | `getBrandColors` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-brand-colors` | Admin | `saveBrandColors` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-app-config` | Admin | `getAppConfig` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-app-config` | Admin | `saveAppConfig` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-letterhead` | Admin | `getLetterhead` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/upload-letterhead` | Admin | `upload.single('letterhead'` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-handbook` | Admin | `getHandbook` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/upload-handbook` | Admin | `upload.single('handbook'` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-insurance-policy` | Admin | `getInsurancePolicy` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/upload-insurance-policy` | Admin | `upload.single('insurancePolicy'` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-tenant-users` | Admin | `getTenantUsers` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/save-user-permission` | Admin | `saveUserPermission` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-user-permission` | Admin | `getUserPermission` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/delete-user-permission` | Admin | `deleteUserPermission` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-company-profile` | AppAdmin | `getCompanyProfile` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-company-profile` | Admin | `logoUpload(['logo']` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-company-logo` | Admin | `getCompanyLogo` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/upload-company-logo` | Admin | `'logoDark']` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/remove-company-logo` | Admin | `removeCompanyLogo` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-app-company-logo` | AppAdmin | `getCompanyLogo` | ../controller/tenant/component; ../controller/tenant/setting; ../controller/tenant/appConfig; ../controller/tenant/userPermission | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/performance.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/performance/cycle/list` | Admin | `hr.listCycles` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/cycle/save` | Admin | `hr.saveCycle` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/cycle/delete` | Admin | `hr.deleteCycle` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/cycle/launch` | Admin | `hr.launchCycle` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/cycle/close` | Admin | `hr.closeCycle` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/review/list` | Admin | `hr.listReviews` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/review/detail` | Admin | `hr.reviewDetail` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/review/lock-goals` | Admin | `hr.lockGoals` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/review/skip-self` | Admin | `hr.skipSelfReview` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/review/approve` | Admin | `hr.approveReview` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/goal/save` | Admin | `hr.saveGoal` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/goal/delete` | Admin | `hr.deleteGoal` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/goal/progress` | Admin | `hr.updateProgress` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/goal/bulk-assign` | Admin | `hr.bulkAssignGoal` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/feedback/request` | Admin | `hr.requestFeedback` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/feedback/remove` | Admin | `hr.removeFeedback` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/dashboard` | Admin | `hr.dashboard` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/report` | Admin | `hr.report` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/history` | Admin | `hr.employeeHistory` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/reviews` | AppAdmin | `portal.myReviews` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/review-detail` | AppAdmin | `portal.reviewDetail` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/goal/save` | AppAdmin | `portal.saveGoal` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/goal/delete` | AppAdmin | `portal.deleteGoal` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/goal/progress` | AppAdmin | `portal.updateProgress` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/self-review` | AppAdmin | `portal.submitSelfReview` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/lock-goals` | AppAdmin | `portal.lockGoals` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/manager-review` | AppAdmin | `portal.submitManagerReview` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/feedback/request` | AppAdmin | `portal.requestFeedback` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/feedback/tasks` | AppAdmin | `portal.myFeedbackTasks` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/feedback/submit` | AppAdmin | `portal.submitFeedback` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/team` | AppAdmin | `portal.teamReviews` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/approvals` | AppAdmin | `portal.pendingApprovals` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/approve` | AppAdmin | `portal.approveReview` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/performance/my/colleagues` | AppAdmin | `portal.colleagues` | ../controller/tenant/performance; ../controller/tenant/performancePortal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/project.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/project/settings` | Admin | `hr.getSettings` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/settings/save` | Admin | `hr.saveSettings` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/client/list` | Admin | `hr.listClients` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/client/save` | Admin | `hr.saveClient` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/list` | Admin | `hr.listProjects` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/save` | Admin | `hr.saveProject` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/detail` | Admin | `hr.projectDetail` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/allocation/save` | Admin | `hr.saveAllocation` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/allocation/remove` | Admin | `hr.removeAllocation` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/task/save` | Admin | `hr.saveTask` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/task/delete` | Admin | `hr.deleteTask` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/timesheet/list` | Admin | `hr.listTimesheets` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/timesheet/detail` | Admin | `hr.timesheetDetail` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/timesheet/act` | Admin | `hr.actOnTimesheet` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/report/utilization` | Admin | `hr.utilizationReport` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/report/projects` | Admin | `hr.projectReport` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/report/clients` | Admin | `hr.clientReport` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/report/reconciliation` | Admin | `hr.reconciliationReport` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/projects` | AppAdmin | `portal.myProjects` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/project-detail` | AppAdmin | `portal.projectDetail` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/task/save` | AppAdmin | `portal.saveTask` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/task/delete` | AppAdmin | `portal.deleteTask` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/allocation/save` | AppAdmin | `portal.saveAllocation` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/allocation/remove` | AppAdmin | `portal.removeAllocation` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/colleagues` | AppAdmin | `portal.colleagues` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/week` | AppAdmin | `portal.week` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/entry/save` | AppAdmin | `portal.saveEntry` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/entry/delete` | AppAdmin | `portal.deleteEntry` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/timer/start` | AppAdmin | `portal.startTimer` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/timer/stop` | AppAdmin | `portal.stopTimer` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/submit` | AppAdmin | `portal.submitWeek` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/approvals` | AppAdmin | `portal.approvals` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/timesheet-detail` | AppAdmin | `portal.timesheetDetail` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/project/my/act` | AppAdmin | `portal.act` | ../controller/tenant/project; ../controller/tenant/projectPortal | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/public.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| GET | `/api/public/landing` | none | `getPublicLanding` | ../controller/landing; ../controller/publicContact; ../controller/publicPayment | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/public/contact` | none | `postPublicContact` | ../controller/landing; ../controller/publicContact; ../controller/publicPayment | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/public/plan/:planId` | none | `getPublicPlan` | ../controller/landing; ../controller/publicContact; ../controller/publicPayment | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/public/razorpay/subscription-start` | none | `postRazorpaySubscriptionStart` | ../controller/landing; ../controller/publicContact; ../controller/publicPayment | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/report.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/employee-report` | Admin | `getEmployeeReport` | ../controller/tenant/report | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/payroll-report` | Admin | `getPayrollReport` | ../controller/tenant/report | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/salary-register-report` | Admin | `getSalaryRegisterReport` | ../controller/tenant/report | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/salary.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/calculate-attendance` | Admin | `calculateAttendance` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/calculate-salary-component` | Admin | `calculateSalaryComponent` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/employee-monthly-leave-attendance-details` | Admin | `employeeMonthlyLeaveAttendanceDetails` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generate-Salary` | Admin | `generateSalary` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generate-Salary-list` | Admin | `GeneratedSalaryList` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/revert-Salary` | Admin | `revertSalary` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/setup-salary` | Admin | `salarySetup` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-salary` | Admin | `updateSalarySetup` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/get-active-salary-component` | Admin | `getActiveSalaryComponents` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getComponentDD` | Admin | `getComponentDD` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getBillDetails` | Admin | `getBillDetails` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/SubmitSalaryDoc` | Admin | `saveSalaryDoc` | ../controller/tenant/salary; ../controller/tenant/component | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/shift.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createShift` | Admin | `createShift` | ../controller/tenant/shift | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getShift` | Admin | `getShift` | ../controller/tenant/shift | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateShift` | Admin | `updateShift` | ../controller/tenant/shift | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteShift` | Admin | `deleteShift` | ../controller/tenant/shift | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/generateDummyAttendance` | none | `generateDummyAttendance` | ../controller/tenant/shift | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/superadmin.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/superadmin/login` | none | `login` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/superadmin/forgot-password` | none | `forgotPassword` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/superadmin/reset-password` | none | `resetPassword` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/stats` | SuperAdmin | `getStats` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/plans` | SuperAdmin | `listPlans` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/superadmin/plans` | SuperAdmin | `createPlan` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PUT | `/api/superadmin/plans/:planId` | SuperAdmin | `updatePlan` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PATCH | `/api/superadmin/plans/:planId/status` | SuperAdmin | `togglePlanStatus` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/tenants` | SuperAdmin | `listTenants` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PATCH | `/api/superadmin/tenants/:tenantId/status` | SuperAdmin | `updateTenantStatus` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PUT | `/api/superadmin/tenants/:tenantId` | SuperAdmin | `"logoDark"]` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PUT | `/api/superadmin/tenants/:tenantId/subscription` | SuperAdmin | `upsertSubscription` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/tenants/:tenantId/company-snapshot` | SuperAdmin | `getTenantCompanySnapshot` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/tenants/:tenantId/subscriptions` | SuperAdmin | `subscriptionHistory` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/users` | SuperAdmin | `listUsers` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PUT | `/api/superadmin/users/:userId` | SuperAdmin | `updateUser` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/analytics` | SuperAdmin | `getAnalytics` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/landing-content` | SuperAdmin | `getLandingContent` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| PUT | `/api/superadmin/landing-content` | SuperAdmin | `saveLandingContent` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/superadmin/contact-messages` | SuperAdmin | `listContactMessages` | ../controller/superadmin/superadmin | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/web.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/login` | none | `login` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/update-password` | none | `UpdatePassword` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/app-login` | none | `Applogin` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| GET | `/api/check-token` | none | `checkToken` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/verify-otp` | none | `verifyOtp` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/AIlogin` | none | `AIlogin` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/logout` | Admin | `logout` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/app-logout` | AppAdmin | `Applogout` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/snap-to-roads` | Admin | `snapToRoads` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/company-register` | none | `'imageDark']` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/send-otp` | none | `interViewerlogin` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/verify-otp-login` | none | `InterviewerverifyOtp` | ../controller/auth/login; ../controller/auth/register; ../helper/googlemap | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/weekOff.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/weekoff/roster/list` | Admin | `listRoster` | ../controller/tenant/weekOffRoster | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/weekoff/roster/save` | Admin | `saveRoster` | ../controller/tenant/weekOffRoster | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/weekoff/roster/delete` | Admin | `deleteRoster` | ../controller/tenant/weekOffRoster | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/weekoff/roster/upload` | Admin | `upload.single("file"` | ../controller/tenant/weekOffRoster | REGISTERED / NEEDS_VERIFICATION |

### `backend/app/routes/workExp.js`

| Method | Path | Guard | Handler | Controllers / helpers required | Status |
|---|---|---|---|---|---|
| POST | `/api/createWorkExp` | Admin | `createWorkExp` | ../controller/tenant/workExp | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getWorkExp` | Admin | `getWorkExp` | ../controller/tenant/workExp | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/updateWorkExp` | Admin | `updateWorkExp` | ../controller/tenant/workExp | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/deleteWorkExp` | Admin | `deleteWorkExp` | ../controller/tenant/workExp | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/createAppWorkExp` | AppAdmin | `createAppWorkExp` | ../controller/tenant/workExp | REGISTERED / NEEDS_VERIFICATION |
| POST | `/api/getAppWorkExp` | AppAdmin | `getAppWorkExp` | ../controller/tenant/workExp | REGISTERED / NEEDS_VERIFICATION |

## Critical employee-facing APIs (inspected behaviour)

These endpoints are highest priority for an employee AI assistant. Behaviour summary is evidence-based from controller/helper inspection; full payload contracts may still need Postman/runtime verification.

### Auth

| Endpoint | Guard | Behaviour (evidence) | R/W |
|---|---|---|---|
| `POST /api/login` | none | Web/admin login by companyCode + credentials; JWT written to `users.token` (~8h). Source: `controller/auth/login.js` | Read + write token |
| `POST /api/app-login` | none | Employee mobile login; requires `emp_status=approved` and `status=active`. Source: `login.js` `Applogin` | Read + write token |
| `POST /api/employee-portal/send-otp` | none | OTP for employee portal. Source: `controller/tenant/employeePortal.js` | Write OTP |
| `POST /api/employee-portal/verify-otp` | none | Verifies OTP; issues employee portal token (`webToken`). | Read + write token |
| `POST /api/logout` | Admin | Clears admin session token | Write |
| `POST /api/app-logout` | AppAdmin | Clears employee token | Write |

### Profile / employee self

| Endpoint | Guard | Behaviour | R/W |
|---|---|---|---|
| `GET /api/get-Emp-Details` | AppAdmin | Returns authenticated employee profile details | Read |
| `POST /api/update-app-emp` | AppAdmin | Employee updates own profile fields | Write |
| `POST /api/uploadEmpImage` | AppAdmin | Upload profile image | Write |

### Attendance

| Endpoint | Guard | Behaviour | R/W |
|---|---|---|---|
| `POST /api/mark-attendance` | AppAdmin | Punch via app; geofence check against branch lat/lng/range; shared punch rules in `helper/attendancePunch.js` | Write |
| `POST /api/get-daily-attendance` | AppAdmin | Daily attendance for employee | Read |
| `POST /api/get-monthly-attendance` | AppAdmin | Monthly attendance | Read |
| `POST /api/create-regularization` | AppAdmin | Create attendance regularization request | Write |
| `POST /api/regularization-list` | AppAdmin | List regularization requests | Read |
| `POST /api/update-status` | AppAdmin | Approve/reject regularization (**status enum not strictly validated** — PARTIALLY) | Write |
| `POST /api/ai-face/internal/punch` | service key | AI face service callback → `recordAttendancePunch` | Write |

### Leave

| Endpoint | Guard | Behaviour | R/W |
|---|---|---|---|
| `POST /api/apply-leaves` | AppAdmin | Employee apply leave (app). Comp-off may deduct at apply time. | Write |
| `POST /api/apply-leave` | Admin | HR/admin apply leave path | Write |
| `POST /api/update-apply-leaves-status` | AppAdmin | Approve/reject leave (app/manager path) | Write |
| `POST /api/get-emp-leave-list` | AppAdmin | Leave balances / types for employee | Read |
| `POST /api/get-my-leave-history` | AppAdmin | Leave history | Read |
| `POST /api/pending-leave-list` | AppAdmin | Pending approvals for manager | Read |
| `POST /api/get-leave-ledger` | Admin | Monthly leave ledger | Read |

### Payroll (employee view)

| Endpoint | Guard | Behaviour | R/W |
|---|---|---|---|
| `POST /api/get-app-bill-details` | AppAdmin | Payslip/bill details for employee | Read |
| `POST /api/print-bill` | AppAdmin | Print/download bill | Read |
| `POST /api/generate-Salary` | Admin | HR generates salary; **trusts client-computed component values** (risk) | Write |

### Expense / reimbursement

| Endpoint | Guard | Behaviour | R/W |
|---|---|---|---|
| `POST /api/expense/my/submit` | AppAdmin | Submit expense claim with validation/limits | Write |
| `POST /api/expense/my/claims` | AppAdmin | List my claims | Read |
| `POST /api/expense/my/act` | AppAdmin | Approver action on claim | Write |
| `POST /api/add-app-reimbursement` | AppAdmin | Legacy reimbursement create | Write |
| `GET /api/reimbursement-list` | AppAdmin | Legacy reimbursement list | Read |

### Assets / timesheet / performance (employee)

| Endpoint | Guard | Behaviour | R/W |
|---|---|---|---|
| `POST /api/asset/my/list` | AppAdmin | My allocated assets | Read |
| `POST /api/asset/my/acknowledge` | AppAdmin | Acknowledge/dispute allocation | Write |
| `POST /api/project/my/week` | AppAdmin | Weekly timesheet view | Read |
| `POST /api/project/my/entry/save` | AppAdmin | Save time entry (hours rules in `helper/projectTime.js`) | Write |
| `POST /api/project/my/submit` | AppAdmin | Submit week for approval | Write |
| `POST /api/performance/my/reviews` | AppAdmin | My performance reviews | Read |
| `POST /api/performance/my/goal/progress` | AppAdmin | Update goal progress | Write |

## Postman collection cross-check

- File: `GENS_API.postman_collection.json` (repo root).
- Contains **175** requests across ~20 folders — **subset** of registered routes (~531 unique).
- Gap: many newer modules (expense workflow, performance, projects, assets, AI face) are under-represented or absent in Postman vs route files.

## Known open / weak endpoints

| Endpoint | Issue | Status |
|---|---|---|
| `POST /api/generateDummyAttendance` | Registered without auth guard in `shift.js` | SECURITY RISK / NEEDS_VERIFICATION |
| `POST /api/get-state-district` | Open in `emp.js` | OPEN |
| `POST /api/getCountryDD` | Open in `country.js` | OPEN |
| Public recruitment endpoints | Intentionally open | IMPLEMENTED |

## How to update this catalog

1. Re-run `node docs/gens-ai-knowledge-base/_gen_api_catalog.js` after route changes.
2. Manually enrich request/response schemas after controller or Postman verification.
3. Never mark an endpoint IMPLEMENTED-runtime without a successful call or automated test.