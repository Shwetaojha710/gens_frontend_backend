import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DashboardService } from '../services/dashboard.service';
import { MasterService } from '../services/master.service';
import { LocationsService } from '../services/locations.service';
import { ThemeService, BrandColors, BRAND_DEFAULTS, APPLY_TO_DEFAULTS, ApplyToModules } from '../services/theme.service';
import { PermissionService, DEFAULT_PERMISSIONS, PermissionSection } from '../services/permission.service';
import { UserPermissionService, TenantUser } from '../master/user-permission/user-permission.service';
import { Notyf } from 'notyf';
import { ChartOptions } from '../dashboard/dashboard.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
@Component({
  selector: 'app-branchwise',
  imports: [FormsModule,NgSelectModule, CommonModule ],
  templateUrl: './branchwise.component.html',
  styleUrl: './branchwise.component.css'
})
export class BranchwiseComponent implements OnInit, OnDestroy {

  private backSub!: Subscription;
  notyf: Notyf = new Notyf();
  public chartOptions!: Partial<ChartOptions>;
  branchList: any
  allBranchList: any = []
  modalSearchText: string = ''
  modalFilteredBranches: any = []
  sliderIndex = 0;
  readonly slidesVisible = 4;
  obj: any = {};
  stats: any = []
  tenantDetails: any = {}
  updateFlag:any=false
  branchDt = [
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "X-Y-Z",
      "description": "Central administration and monitoring access."
    },
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "A-B-C",
      "description": "Central administration and monitoring access."
    },
    {
      "id": "98874c19-03c5-439c-8280-61a615b4983b",
      "name": "D-E-F",
      "description": "Central administration and monitoring access."
    }
  ]
  baseurl: any;

  // Add branch modal state
  newBranch: any = {};
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  addBranchLoading = false;

  // Settings drawer state
  settingsOpen = false;
  settingsLoaded = false;
  saving = false;
  colors: Omit<Required<BrandColors>, 'applyTo'> = { ...BRAND_DEFAULTS };
  applyTo: ApplyToModules = { ...APPLY_TO_DEFAULTS };

  // Edit branch modal state
  editBranch: any = {};
  editBranchId: string | null = null;
  editSelectedImage: File | null = null;
  editImagePreview: string | null = null;
  editBranchLoading = false;

  // Copy master data modal state
  copyMaster: { sourceBranchId: string | null; targetBranchId: string | null } = { sourceBranchId: null, targetBranchId: null };
  copyMasterLoading = false;
  copyMasterResult: any = null;

  // ── Module Permission Drawer ───────────────────────────────────────────────
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
  isAdmin = false;
  permView: 'portals' | 'detail' = 'portals';
  permActivePortal: any | null = null;
  private permCurrentSections: PermissionSection[] = [];

  // 3 portals matching the landing-home cards
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
    private dashboardService: DashboardService,
    private router: Router,
    public masterService: MasterService,
    private locationService: LocationsService,
    private theme: ThemeService,
    private permSvc: PermissionService,
    private userPermSvc: UserPermissionService,
  ) {
    this.baseurl = this.masterService.getBaseUrl();
    this.getBranchDD()
    this.tenantDetails = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.tenantDetails.image = `${this.baseurl}${this.tenantDetails['image']}`
  }

  ngOnInit(): void {
    this.backSub = this.router.events.pipe(
      filter(e => e instanceof NavigationStart && e.navigationTrigger === 'popstate')
    ).subscribe(() => {
      localStorage.clear();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    });

    // Show module permission FAB only for admin / superadmin
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    } catch { this.isAdmin = false; }
  }

  ngOnDestroy(): void {
    this.backSub?.unsubscribe();
  }

  employeeList: any = []
  getEmployeeList() {
    this.branchList = []
    this.employeeList = []
    this.masterService.getemployeeList().subscribe((res) => {
      if (res.status == true) {
        this.notyf.success(res.message || 'Dashboard data loaded successfully')
        this.stats = res.data.stats;
        this.employeeList = res.data
      } else if (res.status == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(res.message || 'Something went wrong')
      }
    });
  }

  cardData: any = {}

createFlag = false;
  create() {
    this.createFlag = true;
  }

  getBranchDD() {
    this.branchList = []
    this.masterService.BranchDD().subscribe((res) => {
      if (res.status == true) {
        this.notyf.success(res.message || 'Dashboard data loaded successfully')
        this.stats = res.data.stats;
        this.allBranchList = res.data.length > 0 ? res.data : this.branchDt;
        this.branchList = this.allBranchList.slice(0, 4);
        this.modalFilteredBranches = this.allBranchList.slice(4);
      } else if (res.status == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(res.message || 'Something went wrong')
      }
    });
  }

  searchModalBranches() {
    const text = this.modalSearchText.trim().toLowerCase();
    if (!text) {
      this.modalFilteredBranches = [...this.allBranchList];
    } else {
      this.modalFilteredBranches = this.allBranchList.filter((b: any) =>
        b.name?.toLowerCase().includes(text) || b.description?.toLowerCase().includes(text)
      );
    }
  }

  clearModalSearch() {
    this.modalSearchText = '';
    this.modalFilteredBranches = this.allBranchList.slice(4);
  }

  openAddBranchModal() {
    this.newBranch = {};
    this.selectedImage = null;
    this.imagePreview = null;
    this.addBranchLoading = false;
  }

  fetchLocation() {
    this.locationService.getCurrentLocation()
      .then((res) => {
        this.newBranch['latitude'] = res.latitude;
        this.newBranch['longitude'] = res.longitude;
      })
      .catch(() => {
        this.notyf.error('Could not fetch location. Please enter manually.');
      });
  }

  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.selectedImage = file;
    const reader = new FileReader();
    reader.onload = () => { this.imagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  submitNewBranch() {
    if (!this.newBranch['name']?.trim()) {
      this.notyf.error('Branch name is required.');
      return;
    }
    this.addBranchLoading = true;
    const formData = new FormData();
    formData.append('name', this.newBranch['name']);
    if (this.newBranch['description']) formData.append('description', this.newBranch['description']);
    if (this.newBranch['latitude']) formData.append('latitude', this.newBranch['latitude']);
    if (this.newBranch['longitude']) formData.append('longitude', this.newBranch['longitude']);
    if (this.selectedImage) formData.append('image', this.selectedImage);

    this.masterService.addBranchWithImage(formData).subscribe({
      next: (res: any) => {
        this.addBranchLoading = false;
        if (res.status === true) {
          this.notyf.success(res.message || 'Branch added successfully');
          this.getBranchDD();
          // close modal programmatically
          const btn = document.getElementById('closeAddBranchModal');
          if (btn) btn.click();
        } else if (res.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res.message || 'Something went wrong');
        }
      },
      error: (err: any) => {
        this.addBranchLoading = false;
        this.notyf.error(err?.error?.message || err?.message || 'Something went wrong');
      }
    });
  }

  getCardImageUrl(branch: any): string {
    if (branch.image) {
      return this.masterService.getImageUrl(branch.image);
    }
    return '/assets/img/bg-login/lko-bg.png';
  }

  openEditBranchModal(branch: any) {
    this.editBranch = { ...branch };
    this.editBranchId = branch.id;
    this.editSelectedImage = null;
    this.editImagePreview = branch.image ? this.masterService.getImageUrl(branch.image) : null;
    this.editBranchLoading = false;
  }

  onEditImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    this.editSelectedImage = file;
    const reader = new FileReader();
    reader.onload = () => { this.editImagePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  fetchLocationForEdit() {
    this.locationService.getCurrentLocation()
      .then((res) => {
        this.editBranch['latitude'] = res.latitude;
        this.editBranch['longitude'] = res.longitude;
      })
      .catch(() => {
        this.notyf.error('Could not fetch location. Please enter manually.');
      });
  }

  submitEditBranch() {
    if (!this.editBranch['name']?.trim()) {
      this.notyf.error('Branch name is required.');
      return;
    }
    this.editBranchLoading = true;
    const formData = new FormData();
    formData.append('id', this.editBranchId!);
    formData.append('name', this.editBranch['name']);
    if (this.editBranch['description']) formData.append('description', this.editBranch['description']);
    if (this.editBranch['latitude']) formData.append('latitude', this.editBranch['latitude']);
    if (this.editBranch['longitude']) formData.append('longitude', this.editBranch['longitude']);
    if (this.editBranch['status']) formData.append('status', this.editBranch['status']);
    if (this.editSelectedImage) formData.append('image', this.editSelectedImage);

    this.masterService.updateBranchWithImage(formData).subscribe({
      next: (res: any) => {
        this.editBranchLoading = false;
        if (res.status === true) {
          this.notyf.success(res.message || 'Branch updated successfully');
          this.getBranchDD();
          const btn = document.getElementById('closeEditBranchModal');
          if (btn) btn.click();
        } else if (res.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res.message || 'Something went wrong');
        }
      },
      error: (err: any) => {
        this.editBranchLoading = false;
        this.notyf.error(err?.error?.message || err?.message || 'Something went wrong');
      }
    });
  }

  goToDashboard(branch: any) {
    // store branch id (important for future APIs)
    localStorage.setItem('branchId', branch.id);
    console.log("reacheedd");

    // redirect to dashboard
    // this.router.navigate(['/layout/dashboard']);
    this.router.navigate(['landing-home']);
  }

  getStatusClass(status: any): string {
    switch (status) {
      case true: return 'badge-outline-success';
      case false: return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }


  filteredDesignation: any = []
  searchText: any = ''
  originalList: any = []
    getUserStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }

  gotoList(){
    this.router.navigate(['pending-emp-list']);
  }

  gotoback(){
    this.router.navigate(['landing-home']);
  }

  // ── Settings drawer ────────────────────────────────

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
        this.notyf.error('Save failed. Please ensure you are logged in as admin.');
      },
    });
  }

  resetSettings(): void {
    this.colors = { ...BRAND_DEFAULTS };
    this.applyTo = { ...APPLY_TO_DEFAULTS };
    this.theme.applyColors(this.colors);
    this.notyf.success('Colors reset to defaults.');
  }

  get maxSliderIndex(): number {
    return Math.max(0, this.allBranchList.length - this.slidesVisible);
  }

  get sliderTranslate(): string {
    return `translateX(-${this.sliderIndex * (100 / this.slidesVisible)}%)`;
  }

  prevSlide(): void {
    if (this.sliderIndex > 0) this.sliderIndex--;
  }

  nextSlide(): void {
    if (this.sliderIndex < this.maxSliderIndex) this.sliderIndex++;
  }

  // ── Module Permission Drawer methods ──────────────────────────────────────

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

  isPortalAllOn(portal: any): boolean {
    return portal.sections.length > 0 &&
      portal.sections.every((s: any) => s.enabled);
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
        this.permView = 'portals';
        this.permActivePortal = null;
        this.permLoadingModules = false;
      },
      error: () => {
        this.permCurrentSections = JSON.parse(JSON.stringify(this.permSvc.load()));
        this.permHasCustom = false;
        this.buildPermModules(user.role);
        this.permView = 'portals';
        this.permActivePortal = null;
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

  togglePermModule(mod: any): void {
    mod.enabled = !mod.enabled;
    // Sync all children with the parent state
    mod.children.forEach((c: any) => c.enabled = mod.enabled);
  }

  togglePermChild(mod: any, child: any): void {
    child.enabled = !child.enabled;
    // If a child is turned ON, parent must also be ON
    if (child.enabled && !mod.enabled) mod.enabled = true;
    // If ALL children are turned OFF, turn parent OFF too
    if (mod.children.length > 0 && mod.children.every((c: any) => !c.enabled)) {
      mod.enabled = false;
    }
  }

  saveModulePermissions(): void {
    if (!this.permSelectedUser) return;
    this.permSaving = true;
    const userRole = this.permSelectedUser.role;

    // Build full PermissionSection[] preserving other roles, toggling this user's role
    const newSections: PermissionSection[] = DEFAULT_PERMISSIONS.map(def => {
      const mod = this.permModules.find(m => m.key === def.key)!;
      const existing = this.permCurrentSections.find(s => s.key === def.key);

      // Section-level roles: keep others, add/remove this user's role
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
        this.notyf.error('Failed to save module access');
      }
    });
  }

  getPermInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  getPermRoleColor(role: string): string {
    const map: Record<string, string> = {
      admin: '#6366f1', superadmin: '#8b5cf6',
      hr: '#0ea5e9', manager: '#f59e0b',
      director: '#10b981', recruiter: '#f97316',
      employee: '#64748b',
    };
    return map[role] || '#64748b';
  }

  openCopyMasterModal(): void {
    this.copyMaster = { sourceBranchId: null, targetBranchId: null };
    this.copyMasterResult = null;
    this.copyMasterLoading = false;
  }

  submitCopyMasterData(): void {
    if (!this.copyMaster.sourceBranchId || !this.copyMaster.targetBranchId) {
      this.notyf.error('Please select both source and target branches.');
      return;
    }
    if (this.copyMaster.sourceBranchId === this.copyMaster.targetBranchId) {
      this.notyf.error('Source and target branches must be different.');
      return;
    }
    this.copyMasterLoading = true;
    this.copyMasterResult = null;
    this.masterService.copyBranchMasterData({
      sourceBranchId: this.copyMaster.sourceBranchId,
      targetBranchId: this.copyMaster.targetBranchId,
    }).subscribe({
      next: (res: any) => {
        this.copyMasterLoading = false;
        if (res.status === true) {
          this.copyMasterResult = res.data;
          this.notyf.success(res.message || 'Master data copied successfully');
        } else if (res.status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res.message || 'Something went wrong');
        }
      },
      error: (err: any) => {
        this.copyMasterLoading = false;
        this.notyf.error(err?.error?.message || err?.message || 'Something went wrong');
      }
    });
  }

}
