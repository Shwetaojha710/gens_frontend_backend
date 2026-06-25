import { Injectable } from '@angular/core';

export type UserRole = 'admin' | 'superadmin' | 'hr' | 'manager' | 'director' | 'recruiter' | 'employee';

export interface PermissionSection {
  key: string;
  label: string;
  icon: string;
  roles: UserRole[];
  children?: PermissionItem[];
}

export interface PermissionItem {
  key: string;
  label: string;
  roles: UserRole[];
}

export const ALL_ROLES: UserRole[] = ['admin', 'superadmin', 'hr', 'manager', 'director', 'recruiter'];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:      'Admin',
  superadmin: 'Super Admin',
  hr:         'HR',
  manager:    'Manager',
  director:   'Director',
  recruiter:  'Recruiter',
  employee:   'Employee',   // employee portal users — not shown on Role Permission page
};

/** Default permission matrix — used if nothing is saved in localStorage */
export const DEFAULT_PERMISSIONS: PermissionSection[] = [
  {
    key: 'dashboard', label: 'Dashboard', icon: 'ri-home-smile-line',
    roles: ['admin', 'superadmin', 'hr', 'manager', 'director'],
  },
  {
    key: 'emp-mgmt', label: 'Employee Management', icon: 'ri-layout-2-line',
    roles: ['admin', 'superadmin', 'hr', 'manager', 'director'],
    children: [
      { key: 'emp-mgmt.add',     label: 'Add Employee',  roles: ['admin', 'superadmin', 'hr'] },
      { key: 'emp-mgmt.leave',   label: 'Apply Leave',   roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
      { key: 'emp-mgmt.letters', label: 'All Letters',   roles: ['admin', 'superadmin', 'hr'] },
    ]
  },
  {
    key: 'attendance', label: 'Attendance & Shift', icon: 'ri-calendar-check-line',
    roles: ['admin', 'superadmin', 'hr', 'manager', 'director'],
    children: [
      { key: 'att.shift',        label: 'Shift Master',          roles: ['admin', 'superadmin', 'hr'] },
      { key: 'att.datewise',     label: 'Date Wise Attendance',  roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
      { key: 'att.holiday',      label: 'Holiday',               roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
      { key: 'att.logs',         label: 'Attendance Logs',       roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
      { key: 'att.leaves',       label: 'Leaves',                roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
      { key: 'att.upload',       label: 'Upload Attendance',     roles: ['admin', 'superadmin', 'hr'] },
      { key: 'att.regularize',   label: 'Regularize',            roles: ['admin', 'superadmin', 'hr'] },
      { key: 'att.weekend',      label: 'Weekend Employee List', roles: ['admin', 'superadmin', 'hr'] },
      { key: 'att.compoff',      label: 'Add Comp Off',          roles: ['admin', 'superadmin', 'hr'] },
      { key: 'att.contractual',  label: 'Contractual Approval',  roles: ['admin', 'superadmin', 'hr'] },
    ]
  },
  {
    key: 'payroll', label: 'Payroll & Compensation', icon: 'ri-money-cny-circle-line',
    roles: ['admin', 'superadmin', 'hr'],
    children: [
      { key: 'pay.generate',   label: 'Generate Salary',       roles: ['admin', 'superadmin', 'hr'] },
      { key: 'pay.list',       label: 'Generated Salary List', roles: ['admin', 'superadmin', 'hr'] },
      { key: 'pay.deduction',  label: 'Deduction Summary',     roles: ['admin', 'superadmin', 'hr'] },
      { key: 'pay.reimburse',  label: 'Reimbursement',         roles: ['admin', 'superadmin', 'hr'] },
    ]
  },
  {
    key: 'reports', label: 'Reports', icon: 'ri-bar-chart-line',
    roles: ['admin', 'superadmin', 'hr', 'manager', 'director'],
    children: [
      { key: 'rep.employee',  label: 'Employee Report',     roles: ['admin', 'superadmin', 'hr'] },
      { key: 'rep.payroll',   label: 'Payroll Report',      roles: ['admin', 'superadmin', 'hr'] },
      { key: 'rep.late',      label: 'Late Arrival Report', roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
      { key: 'rep.tracking',  label: 'Tracking Report',     roles: ['admin', 'superadmin', 'hr', 'manager', 'director'] },
    ]
  },
  {
    key: 'master', label: 'Master', icon: 'ri-settings-3-line',
    roles: ['admin', 'superadmin'],
    children: [
      { key: 'master.designation',  label: 'Designation Master', roles: ['admin', 'superadmin'] },
      { key: 'master.department',   label: 'Department Master',  roles: ['admin', 'superadmin'] },
      { key: 'master.emptype',      label: 'Employment Type',    roles: ['admin', 'superadmin'] },
      { key: 'master.docs',         label: 'Documents',          roles: ['admin', 'superadmin'] },
      { key: 'master.holidaytype',  label: 'Holiday Types',      roles: ['admin', 'superadmin'] },
      { key: 'master.salary',       label: 'Salary Component',   roles: ['admin', 'superadmin'] },
      { key: 'master.payslip',      label: 'Pay Slip Setup',     roles: ['admin', 'superadmin'] },
      { key: 'master.branch',       label: 'Branch',             roles: ['admin', 'superadmin'] },
    ]
  },
  {
    key: 'setting', label: 'Setting', icon: 'ri-settings-3-line',
    roles: ['admin', 'superadmin'],
    children: [
      { key: 'set.attmaster',    label: 'Attendance Master', roles: ['admin', 'superadmin'] },
      { key: 'set.currency',     label: 'Currency',          roles: ['admin', 'superadmin'] },
      { key: 'set.prefix',       label: 'Company Prefix',    roles: ['admin', 'superadmin'] },
      { key: 'set.brand',        label: 'Brand & Colors',    roles: ['admin', 'superadmin'] },
      { key: 'set.roleperm',     label: 'Role Permissions',  roles: ['admin', 'superadmin'] },
      { key: 'set.userperm',     label: 'User Permissions',  roles: ['admin', 'superadmin'] },
      { key: 'set.sidebaraccess',label: 'My Sidebar Access', roles: ['admin', 'superadmin', 'hr', 'manager', 'director', 'recruiter'] },
    ]
  },
  // ── Portal-level visibility keys (control landing-home cards) ───────────────
  {
    key: 'tracking', label: 'Location Tracking', icon: 'ri-map-pin-2-line',
    roles: ['admin', 'superadmin', 'hr', 'manager', 'director'],
  },
  // ── Recruitment module — split by sidebar groups ──────────────────────────
  {
    key: 'recruitment', label: 'Recruitment', icon: 'ri-briefcase-line',
    roles: ['admin', 'superadmin', 'hr', 'recruiter'],
    children: [
      { key: 'rec.dashboard', label: 'Dashboard', roles: ['admin', 'superadmin', 'hr', 'recruiter'] },
    ]
  },
  {
    key: 'rec-analysis', label: 'Recruitment Analysis', icon: 'ri-layout-2-line',
    roles: ['admin', 'superadmin', 'hr', 'recruiter'],
    children: [
      { key: 'rec.analysis', label: 'Job Requirement Analysis', roles: ['admin', 'superadmin', 'hr', 'recruiter'] },
      { key: 'rec.posting',  label: 'Job Posting & Sourcing',   roles: ['admin', 'superadmin', 'hr', 'recruiter'] },
    ]
  },
  {
    key: 'rec-candidates', label: 'Candidate Management', icon: 'ri-profile-line',
    roles: ['admin', 'superadmin', 'hr', 'recruiter'],
    children: [
      { key: 'rec.candidates',  label: 'Candidate Application',  roles: ['admin', 'superadmin', 'hr', 'recruiter'] },
      { key: 'rec.offered',     label: 'Offered Candidate List', roles: ['admin', 'superadmin', 'hr', 'recruiter'] },
      { key: 'rec.offerletter', label: 'Generate Offer Letter',  roles: ['admin', 'superadmin', 'hr'] },
    ]
  },
  {
    key: 'rec-interview', label: 'Interview Management', icon: 'ri-group-line',
    roles: ['admin', 'superadmin', 'hr', 'recruiter'],
    children: [
      { key: 'rec.user', label: 'Add Interview User', roles: ['admin', 'superadmin', 'hr'] },
    ]
  },
  {
    key: 'rec-master', label: 'Recruitment Master', icon: 'ri-settings-3-line',
    roles: ['admin', 'superadmin'],
    children: [
      { key: 'rec.master.round',       label: 'Interview Round', roles: ['admin', 'superadmin'] },
      { key: 'rec.master.roundtype',   label: 'Round Type',      roles: ['admin', 'superadmin'] },
      { key: 'rec.master.department',  label: 'Department',      roles: ['admin', 'superadmin'] },
      { key: 'rec.master.designation', label: 'Designation',     roles: ['admin', 'superadmin'] },
    ]
  },
];

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly ROLE_PERM_KEY   = 'app_role_permissions';
  private readonly USER_PERM_KEY   = 'custom_user_permissions';
  // Bump this version whenever DEFAULT_PERMISSIONS changes — forces a fresh load
  private readonly PERM_VERSION    = 'v5';
  private readonly VERSION_KEY     = 'app_role_permissions_version';

  // ── Role-based permissions (admin configures per role) ──────────────────

  /** Load role-based permissions (or fall back to defaults).
   *  If PERM_VERSION changed (new items added), clears old cache and returns fresh defaults.
   *  Otherwise merges saved data with any new items added to DEFAULT_PERMISSIONS.
   */
  load(): PermissionSection[] {
    // Version check — if version mismatch, wipe old cache and use fresh defaults
    if (localStorage.getItem(this.VERSION_KEY) !== this.PERM_VERSION) {
      localStorage.removeItem(this.ROLE_PERM_KEY);
      localStorage.setItem(this.VERSION_KEY, this.PERM_VERSION);
      return this.deepClone(DEFAULT_PERMISSIONS);
    }
    try {
      const raw = localStorage.getItem(this.ROLE_PERM_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PermissionSection[];
        return this.mergeWithDefaults(saved);
      }
    } catch { /* ignore */ }
    return this.deepClone(DEFAULT_PERMISSIONS);
  }

  /** Merge saved sections with DEFAULT_PERMISSIONS:
   *  - Keeps saved roles for existing keys
   *  - Appends new sections / children that don't exist yet in saved data
   *  Public so user-permission component can also merge DB-loaded custom perms.
   */
  mergeWithDefaults(saved: PermissionSection[]): PermissionSection[] {
    const merged = this.deepClone(saved);

    for (const def of DEFAULT_PERMISSIONS) {
      const existing = merged.find(s => s.key === def.key);
      if (!existing) {
        // Brand-new section — add it entirely
        merged.push(this.deepClone(def));
      } else if (def.children) {
        // Section exists — check for new children
        existing.children = existing.children || [];
        for (const defChild of def.children) {
          const hasChild = existing.children.some(c => c.key === defChild.key);
          if (!hasChild) {
            existing.children.push(this.deepClone(defChild));
          }
        }
      }
    }
    return merged;
  }

  /** Save role-based permission config to localStorage. */
  save(sections: PermissionSection[]): void {
    localStorage.setItem(this.ROLE_PERM_KEY, JSON.stringify(sections));
    localStorage.setItem(this.VERSION_KEY, this.PERM_VERSION);
  }

  /** Reset role-based permissions to factory defaults. */
  reset(): PermissionSection[] {
    localStorage.removeItem(this.ROLE_PERM_KEY);
    return this.deepClone(DEFAULT_PERMISSIONS);
  }

  // ── User-specific permissions (admin configures per individual user) ────

  /** Returns user-specific permissions if set (stored at login). Null = use role defaults. */
  loadCustomUserPermissions(): PermissionSection[] | null {
    try {
      const raw = localStorage.getItem(this.USER_PERM_KEY);
      if (raw) return JSON.parse(raw) as PermissionSection[];
    } catch { /* ignore */ }
    return null;
  }

  // ── Access check ───────────────────────────────────────────────────────

  /**
   * Check if a given role has access to a permission key.
   * Priority: user-specific custom permissions → role-based permissions
   */
  can(key: string, role: string): boolean {
    // 1. Check user-specific permissions (set by admin for this individual user)
    const custom = this.loadCustomUserPermissions();
    if (custom) {
      return this.checkInSections(custom, key, role);
    }
    // 2. Fall back to role-based permissions
    const sections = this.load();
    return this.checkInSections(sections, key, role);
  }

  private checkInSections(sections: PermissionSection[], key: string, role: string): boolean {
    for (const s of sections) {
      if (s.key === key) return s.roles.includes(role as UserRole);
      if (s.children) {
        const child = s.children.find(c => c.key === key);
        if (child) return child.roles.includes(role as UserRole);
      }
    }
    return true; // unknown key = allow
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
