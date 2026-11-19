/**
 * One-off generator for API_CATALOG.md from Express route files.
 * Documentation tooling only — does not modify application code.
 */
const fs = require("fs");
const path = require("path");

const routesDir = path.join(__dirname, "../../backend/app/routes");
const files = fs
  .readdirSync(routesDir)
  .filter((f) => f.endsWith(".js") && f !== "app_6_10_2026.js")
  .sort();

const rows = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(routesDir, file), "utf8");
  const ctrlHints = [...text.matchAll(/require\(['"]([^'"]+)['"]\)/g)]
    .map((m) => m[1])
    .filter((p) => p.includes("controller") || p.includes("helper"));

  const re =
    /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]\s*,([^)]+)\)/gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(text))) {
    const method = m[1].toUpperCase();
    const route = m[2];
    const rest = m[3].replace(/\s+/g, " ").trim();
    const parts = rest.split(",").map((s) => s.trim());
    let guard = "none";
    const handler = parts[parts.length - 1].replace(/\)$/, "");
    const guards = ["Admin", "AppAdmin", "WebcamAdmin", "SuperAdmin", "PanelUser"];
    for (const p of parts.slice(0, -1)) {
      for (const g of guards) {
        if (p.includes(g)) guard = g;
      }
    }
    const key = method + " " + route;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      file,
      method,
      route: "/api" + route,
      guard,
      handler,
      controllers: ctrlHints.join("; "),
    });
  }
}

const out = [];
out.push("# DOCUMENT 03 — API_CATALOG");
out.push("");
out.push(
  "> Generated from route registration in `backend/app/routes/*.js` (excluding backup `app_6_10_2026.js`)."
);
out.push(
  "> Mount prefix: every route file is loaded with `app.use(\"/api\", router)` in `backend/server.js`."
);
out.push(
  "> **Verification status:** routes are **REGISTERED**. Runtime behaviour is **NEEDS_VERIFICATION** unless a deeper controller inspection is cited elsewhere in this knowledge base."
);
out.push(
  "> **Count:** " +
    rows.length +
    " unique method+path combinations from active route files."
);
out.push(
  "> Duplicate registrations inside `app.js`: `POST /pending-leave-list`, `POST /status-wise-leave-list` (first handler wins)."
);
out.push(
  "> Backup file `app_6_10_2026.js` also mounts under `/api` but is a subset of `app.js` paths — treat as **outdated / risk of shadowing depending on filesystem order**."
);
out.push("");
out.push("## Conventions");
out.push("");
out.push(
  "- Typical response envelope via `Helper.response(status, message, data, res, httpCode)` in `backend/app/helper/helper.js`."
);
out.push("- Auth header: `Authorization: Bearer <token>`.");
out.push(
  "- Branch header (Admin / WebcamAdmin): `branchid` / `branchId` (client-supplied; not validated against assigned branches)."
);
out.push("- Most business endpoints use **POST** even for reads.");
out.push(
  '- Errors often return HTTP 200 with `status: false` or `status: "expired"`.'
);
out.push(
  "- Server-side RBAC: **NOT enforced per route** beyond the auth guard role allow-list. UI permissions live in frontend `permission.service.ts`."
);
out.push(
  "- Detailed request/response schemas are included in **Critical employee-facing APIs** below only where controllers were inspected. All other endpoints: request body = **UNKNOWN / NEEDS_VERIFICATION** from route layer alone."
);
out.push("");
out.push("## Auth guards (quick reference)");
out.push("");
out.push("| Guard | Source | Identity table | Notes |");
out.push("|---|---|---|---|");
out.push(
  "| `Admin` | `backend/app/middleware/auth.js` | `users` | Roles: admin, hr, superadmin, employee. Single-session via `users.token`. |"
);
out.push(
  "| `AppAdmin` | same | `empPersonal` | Mobile `token` or web `webToken`. Employee portal / mobile app. |"
);
out.push(
  "| `WebcamAdmin` | same | `users` | Uses `webcamtoken` (longer-lived). |"
);
out.push("| `SuperAdmin` | same | `users` | Requires `role === superadmin`. |");
out.push(
  "| `PanelUser` | `backend/app/middleware/panelAuth.js` | `interview_panel_users` | Interview panel. |"
);
out.push("| none | — | — | Public / OTP / login endpoints. |");
out.push("");
out.push("## Endpoint inventory by route file");
out.push("");

let cur = "";
for (const r of rows) {
  if (r.file !== cur) {
    cur = r.file;
    out.push("");
    out.push("### `backend/app/routes/" + r.file + "`");
    out.push("");
    out.push(
      "| Method | Path | Guard | Handler | Controllers / helpers required | Status |"
    );
    out.push("|---|---|---|---|---|---|");
  }
  out.push(
    "| " +
      r.method +
      " | `" +
      r.route +
      "` | " +
      r.guard +
      " | `" +
      r.handler +
      "` | " +
      r.controllers +
      " | REGISTERED / NEEDS_VERIFICATION |"
  );
}

out.push("");
out.push("## Critical employee-facing APIs (inspected behaviour)");
out.push("");
out.push(
  "These endpoints are highest priority for an employee AI assistant. Behaviour summary is evidence-based from controller/helper inspection; full payload contracts may still need Postman/runtime verification."
);
out.push("");
out.push("### Auth");
out.push("");
out.push("| Endpoint | Guard | Behaviour (evidence) | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `POST /api/login` | none | Web/admin login by companyCode + credentials; JWT written to `users.token` (~8h). Source: `controller/auth/login.js` | Read + write token |"
);
out.push(
  "| `POST /api/app-login` | none | Employee mobile login; requires `emp_status=approved` and `status=active`. Source: `login.js` `Applogin` | Read + write token |"
);
out.push(
  "| `POST /api/employee-portal/send-otp` | none | OTP for employee portal. Source: `controller/tenant/employeePortal.js` | Write OTP |"
);
out.push(
  "| `POST /api/employee-portal/verify-otp` | none | Verifies OTP; issues employee portal token (`webToken`). | Read + write token |"
);
out.push(
  "| `POST /api/logout` | Admin | Clears admin session token | Write |"
);
out.push(
  "| `POST /api/app-logout` | AppAdmin | Clears employee token | Write |"
);
out.push("");
out.push("### Profile / employee self");
out.push("");
out.push("| Endpoint | Guard | Behaviour | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `GET /api/get-Emp-Details` | AppAdmin | Returns authenticated employee profile details | Read |"
);
out.push(
  "| `POST /api/update-app-emp` | AppAdmin | Employee updates own profile fields | Write |"
);
out.push(
  "| `POST /api/uploadEmpImage` | AppAdmin | Upload profile image | Write |"
);
out.push("");
out.push("### Attendance");
out.push("");
out.push("| Endpoint | Guard | Behaviour | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `POST /api/mark-attendance` | AppAdmin | Punch via app; geofence check against branch lat/lng/range; shared punch rules in `helper/attendancePunch.js` | Write |"
);
out.push(
  "| `POST /api/get-daily-attendance` | AppAdmin | Daily attendance for employee | Read |"
);
out.push(
  "| `POST /api/get-monthly-attendance` | AppAdmin | Monthly attendance | Read |"
);
out.push(
  "| `POST /api/create-regularization` | AppAdmin | Create attendance regularization request | Write |"
);
out.push(
  "| `POST /api/regularization-list` | AppAdmin | List regularization requests | Read |"
);
out.push(
  "| `POST /api/update-status` | AppAdmin | Approve/reject regularization (**status enum not strictly validated** — PARTIALLY) | Write |"
);
out.push(
  "| `POST /api/ai-face/internal/punch` | service key | AI face service callback → `recordAttendancePunch` | Write |"
);
out.push("");
out.push("### Leave");
out.push("");
out.push("| Endpoint | Guard | Behaviour | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `POST /api/apply-leaves` | AppAdmin | Employee apply leave (app). Comp-off may deduct at apply time. | Write |"
);
out.push(
  "| `POST /api/apply-leave` | Admin | HR/admin apply leave path | Write |"
);
out.push(
  "| `POST /api/update-apply-leaves-status` | AppAdmin | Approve/reject leave (app/manager path) | Write |"
);
out.push(
  "| `POST /api/get-emp-leave-list` | AppAdmin | Leave balances / types for employee | Read |"
);
out.push(
  "| `POST /api/get-my-leave-history` | AppAdmin | Leave history | Read |"
);
out.push(
  "| `POST /api/pending-leave-list` | AppAdmin | Pending approvals for manager | Read |"
);
out.push(
  "| `POST /api/get-leave-ledger` | Admin | Monthly leave ledger | Read |"
);
out.push("");
out.push("### Payroll (employee view)");
out.push("");
out.push("| Endpoint | Guard | Behaviour | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `POST /api/get-app-bill-details` | AppAdmin | Payslip/bill details for employee | Read |"
);
out.push(
  "| `POST /api/print-bill` | AppAdmin | Print/download bill | Read |"
);
out.push(
  "| `POST /api/generate-Salary` | Admin | HR generates salary; **trusts client-computed component values** (risk) | Write |"
);
out.push("");
out.push("### Expense / reimbursement");
out.push("");
out.push("| Endpoint | Guard | Behaviour | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `POST /api/expense/my/submit` | AppAdmin | Submit expense claim with validation/limits | Write |"
);
out.push(
  "| `POST /api/expense/my/claims` | AppAdmin | List my claims | Read |"
);
out.push(
  "| `POST /api/expense/my/act` | AppAdmin | Approver action on claim | Write |"
);
out.push(
  "| `POST /api/add-app-reimbursement` | AppAdmin | Legacy reimbursement create | Write |"
);
out.push(
  "| `GET /api/reimbursement-list` | AppAdmin | Legacy reimbursement list | Read |"
);
out.push("");
out.push("### Assets / timesheet / performance (employee)");
out.push("");
out.push("| Endpoint | Guard | Behaviour | R/W |");
out.push("|---|---|---|---|");
out.push(
  "| `POST /api/asset/my/list` | AppAdmin | My allocated assets | Read |"
);
out.push(
  "| `POST /api/asset/my/acknowledge` | AppAdmin | Acknowledge/dispute allocation | Write |"
);
out.push(
  "| `POST /api/project/my/week` | AppAdmin | Weekly timesheet view | Read |"
);
out.push(
  "| `POST /api/project/my/entry/save` | AppAdmin | Save time entry (hours rules in `helper/projectTime.js`) | Write |"
);
out.push(
  "| `POST /api/project/my/submit` | AppAdmin | Submit week for approval | Write |"
);
out.push(
  "| `POST /api/performance/my/reviews` | AppAdmin | My performance reviews | Read |"
);
out.push(
  "| `POST /api/performance/my/goal/progress` | AppAdmin | Update goal progress | Write |"
);
out.push("");
out.push("## Postman collection cross-check");
out.push("");
out.push(
  "- File: `GENS_API.postman_collection.json` (repo root)."
);
out.push(
  "- Contains **175** requests across ~20 folders — **subset** of registered routes (~531 unique)."
);
out.push(
  "- Gap: many newer modules (expense workflow, performance, projects, assets, AI face) are under-represented or absent in Postman vs route files."
);
out.push("");
out.push("## Known open / weak endpoints");
out.push("");
out.push("| Endpoint | Issue | Status |");
out.push("|---|---|---|");
out.push(
  "| `POST /api/generateDummyAttendance` | Registered without auth guard in `shift.js` | SECURITY RISK / NEEDS_VERIFICATION |"
);
out.push(
  "| `POST /api/get-state-district` | Open in `emp.js` | OPEN |"
);
out.push(
  "| `POST /api/getCountryDD` | Open in `country.js` | OPEN |"
);
out.push(
  "| Public recruitment endpoints | Intentionally open | IMPLEMENTED |"
);
out.push("");
out.push("## How to update this catalog");
out.push("");
out.push("1. Re-run `node docs/gens-ai-knowledge-base/_gen_api_catalog.js` after route changes.");
out.push("2. Manually enrich request/response schemas after controller or Postman verification.");
out.push("3. Never mark an endpoint IMPLEMENTED-runtime without a successful call or automated test.");

fs.writeFileSync(path.join(__dirname, "API_CATALOG.md"), out.join("\n"));
console.log("Wrote API_CATALOG.md with", rows.length, "endpoints");
