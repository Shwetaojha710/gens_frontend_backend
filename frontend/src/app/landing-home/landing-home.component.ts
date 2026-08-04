import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { ViewEncapsulation } from '@angular/core';
import { MasterService } from '../services/master.service';
import { ThemeService, BrandColors, BRAND_DEFAULTS, APPLY_TO_DEFAULTS, ApplyToModules } from '../services/theme.service';
import { PermissionService, DEFAULT_PERMISSIONS, PermissionSection } from '../services/permission.service';
import { UserPermissionService, TenantUser } from '../master/user-permission/user-permission.service';

@Component({
  selector: 'app-landing-home',
  imports: [CommonModule, FormsModule],
  standalone: true,
  templateUrl: './landing-home.component.html',
  styleUrls: ['./landing-home.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class LandingHomeComponent {
  notyf: Notyf = new Notyf();
  branchList: any;
  obj: any = {};
  stats: any = [];
  tenantDetails: any = {};
  baseurl: any;
  isAdmin = false;

  // Settings drawer state
  settingsOpen = false;
  settingsLoaded = false;
  saving = false;
  colors: Omit<Required<BrandColors>, 'applyTo'> = { ...BRAND_DEFAULTS };
  applyTo: ApplyToModules = { ...APPLY_TO_DEFAULTS };

  // ── Module Permission Drawer ─────────────────────────────────────────
  permDrawerOpen = false;
  permUsers: TenantUser[] = [];
  permFilteredUsers: TenantUser[] = [];
  permSearchQuery = '';
  permSelectedUser: TenantUser | null = null;
  permModules: {
    key: string; label: string; icon: string;
    enabled: boolean; expanded: boolean;
    children: { key: string; label: string; enabled: boolean; }[];
  }[] = [];
  permLoadingUsers = false;
  permLoadingModules = false;
  permSaving = false;
  permHasCustom = false;
  permView: 'portals' | 'detail' = 'portals';
  permActivePortal: any | null = null;
  private permCurrentSections: PermissionSection[] = [];


  // 3 portals matching landing-home cards
  private readonly PORTAL_GROUPS = [
    {
      key: 'recruitment',
      label: 'Recruitment',
      icon: 'ri-briefcase-line',
      bgImg: '/assets/img/bg-login/555.jpg',
      sectionKeys: ['recruitment', 'rec-analysis', 'rec-candidates', 'rec-interview', 'rec-master'],
    },
    {
      key: 'emp-management',
      label: 'Employee Management',
      icon: 'ri-layout-2-line',
      bgImg: '/assets/img/bg-login/emp_img111.png',
      sectionKeys: ['dashboard', 'emp-mgmt', 'attendance', 'payroll', 'reports', 'master', 'setting'],
    },
    {
      key: 'location-tracking',
      label: 'Location Tracking',
      icon: 'ri-map-pin-2-line',
      bgImg: '/assets/img/bg-login/location_tracking.png',
      sectionKeys: ['tracking'],
    },
  ];

  constructor(
    private router: Router,
    public masterService: MasterService,
    private theme: ThemeService,
    private permSvc: PermissionService,
    private userPermSvc: UserPermissionService,
  ) {
    this.baseurl = this.masterService.getBaseUrl();
    this.tenantDetails = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.tenantDetails.image = `${this.baseurl}${this.tenantDetails['image']}`;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    } catch { this.isAdmin = false; }
  }

  goToOnboarding()        { this.router.navigate(['recruitment/recruitment-dashboard']); }
  goToEmployeeManagement(){ this.router.navigate(['layout/dashboard']); }
  goToTracking()          { this.router.navigate(['layout/tracking']); }

  // ── Portal card visibility ───────────────────────────────────────────────
  private get _userRole(): string {
    try { return JSON.parse(localStorage.getItem('user') || '{}')?.role || 'hr'; }
    catch { return 'hr'; }
  }

  get showRecruitment(): boolean    { return this.permSvc.can('rec.dashboard', this._userRole); }
  get showEmpManagement(): boolean  { return this.permSvc.can('dashboard', this._userRole); }
  get showTracking(): boolean       { return this.permSvc.can('tracking', this._userRole); }

  // ── Permission Drawer ────────────────────────────────────────────────

  openPermDrawer(): void {
    this.permDrawerOpen = true;
    if (!this.permUsers.length) this.loadPermUsers();
  }

  closePermDrawer(): void {
    this.permDrawerOpen = false;
    this.permSelectedUser = null;
    this.permModules = [];
    this.permView = 'portals';
    this.permActivePortal = null;
  }

  loadPermUsers(): void {
    this.permLoadingUsers = true;
    this.userPermSvc.getTenantUsers().subscribe({
      next: (res: any) => {
        this.permUsers = res?.data || [];
        this.permFilteredUsers = [...this.permUsers];
        this.permLoadingUsers = false;
      },
      error: () => { this.permLoadingUsers = false; }
    });
  }

  searchPermUsers(): void {
    const q = this.permSearchQuery.toLowerCase().trim();
    this.permFilteredUsers = q
      ? this.permUsers.filter(u =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        )
      : [...this.permUsers];
  }
  // ngOnInit(): void {
  //   this.loadCompanyProfile();
  // }

  selectPermUser(user: TenantUser): void {
    this.permSelectedUser = user;
    this.permLoadingModules = true;
    this.permModules = [];
    this.permView = 'portals';
    this.permActivePortal = null;

    this.userPermSvc.getUserPermission(user.id).subscribe({
      next: (res: any) => {
        const custom: PermissionSection[] | null = res?.data || null;
        if (custom && custom.length > 0) {
          this.permCurrentSections = this.permSvc.mergeWithDefaults(custom);
          this.permHasCustom = true;
        } else {
          this.permCurrentSections = JSON.parse(JSON.stringify(this.permSvc.load()));
          this.permHasCustom = false;
        }
        this.buildPermModules(user.role);
        this.permLoadingModules = false;
      },
      error: () => {
        this.permCurrentSections = JSON.parse(JSON.stringify(this.permSvc.load()));
        this.permHasCustom = false;
        this.buildPermModules(user.role);
        this.permLoadingModules = false;
      }
    });
  }

  private buildPermModules(userRole: string): void {
    this.permModules = DEFAULT_PERMISSIONS.map(def => {
      const section = this.permCurrentSections.find(s => s.key === def.key);
      const sectionEnabled = section
        ? (section.roles as string[]).includes(userRole)
        : false;
      return {
        key: def.key,
        label: def.label,
        icon: def.icon,
        enabled: sectionEnabled,
        expanded: true,
        children: (def.children || []).map(child => {
          const savedChild = section?.children?.find(c => c.key === child.key);
          const childEnabled = savedChild
            ? (savedChild.roles as string[]).includes(userRole)
            : sectionEnabled;
          return { key: child.key, label: child.label, enabled: childEnabled };
        }),
      };
    });
  }

  get permPortals(): any[] {
    return this.PORTAL_GROUPS.map(pg => ({
      ...pg,
      sections: this.permModules.filter(m => pg.sectionKeys.includes(m.key)),
    }));
  }

  openPortalDetail(portal: any): void {
    if (portal.sections.length === 0) return;
    this.permActivePortal = portal;
    this.permView = 'detail';
  }

  backToPortals(): void {
    this.permActivePortal = null;
    this.permView = 'portals';
  }

  portalStatus(portal: any): 'full' | 'partial' | 'none' {
    if (portal.sections.length === 0) return 'none';
    const all: boolean[] = [];
    for (const s of portal.sections) {
      all.push(s.enabled);
      s.children.forEach((c: any) => all.push(c.enabled));
    }
    const enabled = all.filter(x => x).length;
    if (enabled === 0) return 'none';
    if (enabled === all.length) return 'full';
    return 'partial';
  }

  portalTotalMenus(portal: any): number {
    let n = 0;
    for (const s of portal.sections) {
      n += s.children.length > 0 ? s.children.length : 1;
    }
    return n;
  }

  togglePortalAll(portal: any): void {
    const allOn = portal.sections.every((s: any) => s.enabled);
    const newState = !allOn;
    portal.sections.forEach((s: any) => {
      s.enabled = newState;
      s.children.forEach((c: any) => c.enabled = newState);
    });
  }

  togglePermModule(mod: any): void {
    mod.enabled = !mod.enabled;
    mod.children.forEach((c: any) => c.enabled = mod.enabled);
  }

  togglePermChild(mod: any, child: any): void {
    child.enabled = !child.enabled;
    if (child.enabled && !mod.enabled) mod.enabled = true;
    if (mod.children.length > 0 && mod.children.every((c: any) => !c.enabled)) {
      mod.enabled = false;
    }
  }

  isPortalAllOn(portal: any): boolean {
    return portal.sections.length > 0 &&
      portal.sections.every((s: any) => s.enabled);
  }

  saveModulePermissions(): void {
    if (!this.permSelectedUser) return;
    this.permSaving = true;
    const userRole = this.permSelectedUser.role;

    const newSections: PermissionSection[] = DEFAULT_PERMISSIONS.map(def => {
      const mod = this.permModules.find(m => m.key === def.key)!;
      const existing = this.permCurrentSections.find(s => s.key === def.key);

      const otherRoles = ((existing?.roles || def.roles) as string[]).filter(r => r !== userRole);
      const sectionRoles = mod.enabled ? [...otherRoles, userRole] : otherRoles;

      const children = (def.children || []).map(child => {
        const modChild = mod.children.find(c => c.key === child.key);
        const existingChild = existing?.children?.find(c => c.key === child.key);
        const otherChildRoles = ((existingChild?.roles || child.roles) as string[]).filter(r => r !== userRole);
        const childEnabled = modChild ? modChild.enabled : mod.enabled;
        const childRoles = childEnabled ? [...otherChildRoles, userRole] : otherChildRoles;
        return { key: child.key, label: child.label, roles: childRoles as any };
      });

      return {
        key: def.key, label: def.label, icon: def.icon,
        roles: sectionRoles as any,
        ...(children.length > 0 ? { children } : {}),
      };
    });

    this.userPermSvc.saveUserPermission(this.permSelectedUser.id, newSections).subscribe({
      next: () => {
        this.permSaving = false;
        this.permHasCustom = true;
        this.notyf.success(`Access saved for ${this.permSelectedUser!.name}. They must re-login to apply changes.`);
      },
      error: () => {
        this.permSaving = false;
        this.notyf.error('Failed to save permissions');
      }
    });
  }

  getPermInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getPermRoleColor(role: string): string {
    const map: Record<string, string> = {
      admin: '#6366f1', superadmin: '#8b5cf6', hr: '#0ea5e9',
      manager: '#f59e0b', director: '#10b981', recruiter: '#f97316', employee: '#64748b',
    };
    return map[role] || '#64748b';
  }

  // ── Settings Drawer ──────────────────────────────────────────────────

  openSettings(): void {
    this.settingsOpen = true;
    if (!this.settingsLoaded) this.loadSettings();
  }

  closeSettings(): void { this.settingsOpen = false; }

  loadSettings(): void {
    const cached = this.theme.getCached();
    if (cached) {
      this.colors = { ...BRAND_DEFAULTS, ...cached };
      this.applyTo = { ...APPLY_TO_DEFAULTS, ...(cached.applyTo || {}) };
    }
    this.masterService.getBrandColors().subscribe({
      next: (res: any) => {
        if (res?.status && res.data && Object.keys(res.data).length > 0) {
          this.colors = { ...BRAND_DEFAULTS, ...res.data };
          this.applyTo = { ...APPLY_TO_DEFAULTS, ...(res.data.applyTo || {}) };
        }
        this.settingsLoaded = true;
      },
      error: () => { this.settingsLoaded = true; },
    });
  }

  previewColors(): void { this.theme.applyColors(this.colors); }

  saveSettings(): void {
    this.saving = true;
    const payload: BrandColors = { ...this.colors, applyTo: this.applyTo };
    this.masterService.saveBrandColors(payload).subscribe({
      next: () => {
        this.saving = false;
        this.theme.saveToCache(payload);
        this.theme.applyColors(this.colors);
        this.notyf.success('Brand colors saved successfully.');
      },
      error: () => {
        this.saving = false;
        this.notyf.error('Save failed. Please make sure you are logged in as admin.');
      },
    });
  }

  resetSettings(): void {
    this.colors = { ...BRAND_DEFAULTS };
    this.applyTo = { ...APPLY_TO_DEFAULTS };
    this.theme.applyColors(this.colors);
    this.notyf.success('Colors reset to defaults.');
  }
}
