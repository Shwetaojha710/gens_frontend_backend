import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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
export class HeaderComponent {
  notyf: Notyf = new Notyf();
  tenantDetails: any = {}
  baseurl: any

  @ViewChild('searchInputRef') searchInputRef?: ElementRef<HTMLInputElement>;

  private searchIndex: SearchResult[] = [];
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
    private permSvc: PermissionService
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
  ngOnInit() {
    this.personalDetail = JSON.parse(localStorage.getItem('user') || '{}');
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
