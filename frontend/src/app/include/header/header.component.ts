import { Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Notyf } from 'notyf';
import { Router } from '@angular/router';
import { MasterService } from '../../services/master.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { RouterModule } from '@angular/router';
import { MobileMenuService } from '../../services/mobile-menu.service';
import { PermissionService } from '../../services/permission.service';
import { APP_MENU_ITEMS, MenuItem } from '../../navbar/navigation';
import { Subscription } from 'rxjs';
import { CompanyLogoService } from '../../services/company-logo.service';

interface SearchResult {
  title: string;
  link: string;
  group: string;
  icon: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnDestroy {
  notyf: Notyf = new Notyf();
  tenantDetails: any = {}
  baseurl: any
  /** Avatar fallback when the company has no logo */
  readonly defaultAvatarLogo = 'assets/img/marketing/gens-logo.png';
  companyLogoUrl: string | null = null;
  private logoSub?: Subscription;

  @ViewChild('searchInputRef') searchInputRef?: ElementRef<HTMLInputElement>;

  private searchIndex: SearchResult[] = [];
  private notifPollTimer: ReturnType<typeof setInterval> | null = null;
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showResults = false;
  activeResultIndex = -1;

  constructor(
    private auth: AuthService,
    private router: Router,
    private eRef: ElementRef,
    public masterService: MasterService,
    public mobileMenu: MobileMenuService,
    private permSvc: PermissionService,
    public companyLogoSvc: CompanyLogoService
  ) {
    this.getBranchDD()
      this.baseurl = this.masterService.getBaseUrl();
    this.obj.branchId = localStorage.getItem('branchId') || '';
     this.tenantDetails=JSON.parse(localStorage.getItem('tenant') || '{}');
     this.tenantDetails.image=`${this.baseurl}${this.tenantDetails['image']}`
     const role = JSON.parse(localStorage.getItem('user') || '{}')?.role || 'hr';
     this.searchIndex = this.buildSearchIndex(APP_MENU_ITEMS, '', role);
  }
  isDropdownOpen = false;
  editProfileOpen = false;
  editSaving = false;
  editLogoFile: File | null = null;
  editLogoPreview: string | null = null;
  editForm = {
    companyName: '',
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  branchList: any
  obj: any = {};
  stats: any = []
  getBranchDD() {
    this.branchList = []
    this.masterService.BranchDD().subscribe((res) => {
      if (res.status == true) {
        // this.notyf.success(res.message || 'Dashboard data loaded successfully')
        this.stats = res.data.stats;
        this.branchList = res.data
      } else if (res.status == 'expired') {
        this.router.navigate(['login'])
      } else {
        this.notyf.error(res.message || 'Something went wrong')
      }
    });
  }

  toggleshow() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  openEditProfile(e?: Event): void {
    e?.stopPropagation();
    this.isDropdownOpen = false;
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.editForm = {
      companyName: String(tenant?.companyName || ''),
      name: String(this.personalDetail?.name || ''),
      email: String(this.personalDetail?.email || ''),
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    this.editLogoFile = null;
    this.editLogoPreview = null;
    this.editProfileOpen = true;
  }

  closeEditProfile(): void {
    if (this.editSaving) return;
    this.editProfileOpen = false;
    this.editLogoFile = null;
    this.editLogoPreview = null;
  }

  onEditLogoPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const okTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!okTypes.includes(file.type)) {
      this.notyf.error('Only PNG or JPG images are allowed.');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.notyf.error('Maximum image size is 2 MB.');
      input.value = '';
      return;
    }
    this.editLogoFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.editLogoPreview = reader.result as string);
    reader.readAsDataURL(file);
    input.value = '';
  }

  saveCompanyProfile(): void {
    const companyName = this.editForm.companyName.trim();
    const name = this.editForm.name.trim();
    if (!companyName) {
      this.notyf.error('Company name is required.');
      return;
    }
    if (!name) {
      this.notyf.error('Admin name is required.');
      return;
    }

    const newPass = this.editForm.newPassword;
    const confirm = this.editForm.confirmPassword;
    if (newPass || confirm || this.editForm.currentPassword) {
      if (!this.editForm.currentPassword) {
        this.notyf.error('Enter current password to change password.');
        return;
      }
      if (newPass.length < 6) {
        this.notyf.error('New password must be at least 6 characters.');
        return;
      }
      if (newPass !== confirm) {
        this.notyf.error('New password and confirm password do not match.');
        return;
      }
    }

    const fd = new FormData();
    fd.append('companyName', companyName);
    fd.append('name', name);
    if (newPass) {
      fd.append('currentPassword', this.editForm.currentPassword);
      fd.append('newPassword', newPass);
    }
    if (this.editLogoFile) {
      fd.append('logo', this.editLogoFile, this.editLogoFile.name);
    }

    this.editSaving = true;
    this.masterService.updateCompanyProfile(fd).subscribe({
      next: (res: any) => {
        this.editSaving = false;
        if (res?.status === true) {
          const data = res.data || {};
          this.personalDetail = {
            ...this.personalDetail,
            name: data.name || name,
            email: data.email || this.personalDetail?.email,
            role: data.role || this.personalDetail?.role,
          };
          try {
            localStorage.setItem('user', JSON.stringify(this.personalDetail));
            const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
            tenant.companyName = data.companyName || companyName;
            if (data.url) tenant.image = data.url;
            localStorage.setItem('tenant', JSON.stringify(tenant));
          } catch { /* ignore */ }

          if (data.url || data.darkUrl) {
            this.companyLogoSvc.setLogos({
              light: data.url || this.companyLogoSvc.current('admin', 'light'),
              dark: data.darkUrl || this.companyLogoSvc.current('admin', 'dark'),
            });
            this.companyLogoUrl = this.companyLogoSvc.current('admin');
          } else if (this.editLogoFile) {
            this.companyLogoSvc.refresh('admin');
          }

          this.notyf.success(res.message || 'Profile updated.');
          this.editProfileOpen = false;
          this.editLogoFile = null;
          this.editLogoPreview = null;
        } else {
          this.notyf.error(res?.message || 'Could not update profile.');
        }
      },
      error: (err) => {
        this.editSaving = false;
        this.notyf.error(err?.error?.message || 'Could not update profile.');
      },
    });
  }
  onBranchChange(branchId: any) {
    console.log('Selected Branch ID:', branchId);
    localStorage.setItem('branchId', branchId)
    window.location.reload();
  }
  // listen for clicks anywhere in the document
  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen = false; // close if clicked outside
      this.showResults = false;
      this.showNotifications = false;
    }
  }

  // CTRL/CMD + K focuses the search box from anywhere on the page
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchInputRef?.nativeElement.focus();
    }
  }

  // ── Global page search ────────────────────────────────────────────────────
  private buildSearchIndex(items: MenuItem[], group = '', role = 'hr'): SearchResult[] {
    let results: SearchResult[] = [];
    for (const item of items) {
      if (item.permKey && !this.permSvc.can(item.permKey, role)) continue;
      if (item.children?.length) {
        results = results.concat(this.buildSearchIndex(item.children, item.title, role));
      } else if (item.link) {
        results.push({ title: item.title, link: item.link, group, icon: item.icon });
      }
    }
    return results;
  }



  onSearchInput(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.activeResultIndex = -1;
    if (!query) {
      this.searchResults = [];
      this.showResults = false;
      return;
    }
    this.searchResults = this.searchIndex
      .filter(item => item.title.toLowerCase().includes(query) || item.group.toLowerCase().includes(query))
      .slice(0, 8);
    this.showResults = true;
  }

  onSearchFocus(): void {
    if (this.searchQuery.trim()) {
      this.showResults = true;
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.clearSearch();
      return;
    }
    if (!this.showResults || !this.searchResults.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeResultIndex = (this.activeResultIndex + 1) % this.searchResults.length;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeResultIndex = this.activeResultIndex <= 0
        ? this.searchResults.length - 1
        : this.activeResultIndex - 1;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const result = this.searchResults[this.activeResultIndex >= 0 ? this.activeResultIndex : 0];
      this.selectResult(result);
    }
  }

  selectResult(result: SearchResult): void {
    this.router.navigate([result.link]);
    this.clearSearch();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showResults = false;
    this.activeResultIndex = -1;
  }
  // toggleshow() {
  //   const dropdownMenu = document.querySelector(".dropdown-menu.dropdown-menu-end.mt-3.py-2");
  //   if (dropdownMenu) {
  //     dropdownMenu.classList.toggle("show");
  //   }
  // }
  personalDetail: any = {}
  notifications: any[] = [];
  unreadCount = 0;
  showNotifications = false;
  ngOnInit() {
    this.personalDetail = JSON.parse(localStorage.getItem('user') || '{}');
    this.companyLogoUrl = this.companyLogoSvc.current('admin');
    this.logoSub = this.companyLogoSvc.logo$('admin').subscribe(() => {
      this.companyLogoUrl = this.companyLogoSvc.current('admin');
    });
    this.loadNotifications();
    this.notifPollTimer = setInterval(() => this.loadNotifications(), 60000);
  }

  ngOnDestroy() {
    this.logoSub?.unsubscribe();
    if (this.notifPollTimer) {
      clearInterval(this.notifPollTimer);
      this.notifPollTimer = null;
    }
  }

  toggleNotifications(e: Event) {
    e.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.isDropdownOpen = false;
    if (this.showNotifications) this.loadNotifications();
  }
  loadNotifications() {
    this.masterService.getHeaderNotifications({ limit: 12 }).subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          this.notifications = res.data?.items || [];
          this.unreadCount = res.data?.count ?? this.notifications.filter((n: any) => !n.read).length;
        }
      },
      error: () => {}
    });
  }
  openNotification(n: any) {
    this.showNotifications = false;
    if (!n.read) this.markOneRead(n);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  markOneRead(n: any, e?: Event) {
    e?.stopPropagation();
    if (!n || n.read) return;
    this.masterService.markHeaderNotificationsRead({
      items: [{
        refType: n.refType,
        refId: n.refId,
        status: n.status,
        updatedAtSnapshot: n.updatedAtSnapshot,
      }],
    }).subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          n.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      },
      error: () => {},
    });
  }

  markAllRead(e?: Event) {
    e?.stopPropagation();
    this.masterService.markHeaderNotificationsRead({ markAll: true }).subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          this.notifications = this.notifications.map((n) => ({ ...n, read: true }));
          this.unreadCount = 0;
        }
      },
      error: () => {},
    });
  }

  logout() {
    console.log("hello logout api called")

    this.auth.logout().subscribe({
      next: (res) => {
        const data = res
        console.log(data, "ss")
        if (data.status === true) {
          localStorage.clear()
          if (this.notyf) {
            this.notyf.success(data.message);
          }
          this.router.navigate(['login']);
        }
        else if (data.status == 'expired') {
          this.notyf?.error(data.message);
          this.router.navigate(['login']);
        }
        else {
          if (this.notyf) {
            this.notyf.error(data.message);
          }
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        if (this.notyf) {
          this.notyf.error(err.error?.message || 'Server error. Please try again.');
        }
      }
    });

  }
  profilePage() {

    // this.router.navigate(['login']);

  }

  get showLocationButton(): boolean {
    // Hide on recruitment and employee pages
    const currentUrl = this.router.url;
    if (currentUrl.startsWith('/recruitment') || currentUrl.startsWith('/layout/employee')) {
      return false;
    }
    // Also hide if user doesn't have tracking permission
    try {
      const role = JSON.parse(localStorage.getItem('user') || '{}')?.role || 'hr';
      return this.permSvc.can('tracking', role);
    } catch {
      return false;
    }
  }
}
