import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem, UserRole } from './recuirtment-navigation';
import { MobileMenuService } from '../../services/mobile-menu.service';
import { PermissionService } from '../../services/permission.service';

@Component({
  selector: 'app-recruitment-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recruitment-navbar.component.html',
  styleUrls: ['./recruitment-navbar.component.css']
})
export class RecruitmentNavbarComponent implements OnInit, OnDestroy {
  openMenu: string | null = null;
  isCollapsed = false;
  isMobileOpen = false;
  menuItems: MenuItem[] = [];

  private userRole: UserRole = 'hr';
  private sub = new Subscription();

  get isMobile(): boolean {
    return window.innerWidth < 992;
  }

  @HostBinding('style.width') get hostWidth(): string {
    if (this.isMobile) return '0px';
    return this.isCollapsed ? '84px' : '248px';
  }

  @HostBinding('style.minWidth') get hostMinWidth(): string {
    if (this.isMobile) return '0px';
    return this.isCollapsed ? '84px' : '248px';
  }

  @HostBinding('style.flex') get hostFlex(): string {
    if (this.isMobile) return '0 0 0px';
    return this.isCollapsed ? '0 0 84px' : '0 0 248px';
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobile) this.isMobileOpen = false;
  }

  constructor(
    private router: Router,
    private elRef: ElementRef,
    private mobileMenu: MobileMenuService,
    private permSvc: PermissionService
  ) {}

  ngOnInit(): void {
    // ── Read user role from localStorage ──────────────────────────────────
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.userRole = ((user?.role as UserRole) || 'hr');
    } catch {
      this.userRole = 'hr';
    }

    // ── Build and filter menu using PermissionService ─────────────────────
    this.menuItems = this.filterByRole(this.allMenuItems());

    this.sub.add(
      this.mobileMenu.open$.subscribe(open => {
        this.isMobileOpen = open;
        document.body.style.overflow = open ? 'hidden' : '';
      })
    );

    this.sub.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuItem(event.urlAfterRedirects);
          if (this.isMobile) this.mobileMenu.close();
        }
      })
    );

    this.setActiveMenuItem(this.router.url);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    document.body.style.overflow = '';
  }

  // ── Role filter via PermissionService (dynamic) ───────────────────────────
  private filterByRole(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => {
        // permKey → check PermissionService (controlled via Role Permission page)
        if (item['permKey']) {
          return this.permSvc.can(item['permKey'], this.userRole);
        }
        // static roles fallback
        if (item['roles']) {
          return (item['roles'] as UserRole[]).includes(this.userRole);
        }
        // no restriction = visible to all
        return true;
      })
      .map(item => {
        if (!item.children) return item;
        const filteredChildren = this.filterByRole(item.children);
        return { ...item, children: filteredChildren };
      })
      .filter(item => item.children === undefined || item.children.length > 0);
  }

  // ── Full menu definition — each item mapped to a PermissionService key ────
  private allMenuItems(): MenuItem[] {
    return [
      {
        title: 'Dashboard',
        icon: 'ri-home-smile-line',
        active: true,
        link: '/recruitment/recruitment-dashboard',
        permKey: 'rec.dashboard',
      },
      {
        title: 'Recruitment Analysis',
        icon: 'ri-layout-2-line',
        permKey: 'rec-analysis',
        children: [
          { title: 'Job Requirement Analysis', icon: 'ri-user-add-line', link: '/recruitment/jobs/job-requirement',  permKey: 'rec.analysis' },
          { title: 'Job Posting & Sourcing',   icon: 'ri-user-add-line', link: '/recruitment/jobs/posting-sourcing', permKey: 'rec.posting' },
        ]
      },
      {
        title: 'Candidate Management',
        icon: 'ri-profile-line',
        permKey: 'rec-candidates',
        children: [
          { title: 'Candidate Application',  icon: 'ri-profile-line',   link: '/recruitment/application-list',       permKey: 'rec.candidates' },
          { title: 'Offered Candidate List', icon: 'ri-hand-coin-line', link: '/recruitment/offered-candidate-list', permKey: 'rec.offered' },
          { title: 'Generate Offer Letter',  icon: 'ri-file-text-line', link: '/recruitment/offers/offer-letter',    permKey: 'rec.offerletter' },
        ]
      },
      {
        title: 'Interview Management',
        icon: 'ri-group-line',
        permKey: 'rec-interview',
        children: [
          { title: 'Add User', icon: 'ri-profile-line', link: '/recruitment/user', permKey: 'rec.user' },
        ]
      },
      {
        title: 'Master',
        icon: 'ri-settings-3-line',
        permKey: 'rec-master',
        children: [
          { title: 'Interview Round', icon: 'ri-building-4-line', link: '/recruitment/master/interview-round', permKey: 'rec.master.round' },
          { title: 'Round Type',      icon: 'ri-building-4-line', link: '/recruitment/master/round-type',      permKey: 'rec.master.roundtype' },
          { title: 'Department',      icon: 'ri-community-line',  link: '/recruitment/master/department',      permKey: 'rec.master.department' },
          { title: 'Designation',     icon: 'ri-award-line',      link: '/recruitment/master/designation',     permKey: 'rec.master.designation' },
        ]
      },
    ];
  }

  closeMobileMenu(): void {
    this.mobileMenu.close();
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  get companyLogo(): string {
    return 'assets/img/logo/logo-quaere.png';
  }

  toggleItem(menu: MenuItem): void {
    if (this.isCollapsed) return;
    this.menuItems.forEach(item => {
      if (item !== menu && item.children?.length) item['open'] = false;
    });
    menu['open'] = !menu['open'];
  }

  isAnyChildActive(children: any[]): boolean {
    if (!children) return false;
    return children.some(child => child.active || (child.children && this.isAnyChildActive(child.children)));
  }

  async setActiveMenuItem(currentUrl: string) {
    const markActive = (items: MenuItem[]): boolean => {
      let anyActive = false;
      items.forEach(item => {
        item.active = item.link === currentUrl;
        if (item.children?.length) {
          const childActive = markActive(item.children);
          item.active = item.active || childActive;
          item['open'] = childActive;
        }
        anyActive ||= item.active;
      });
      return anyActive;
    };
    markActive(this.menuItems);
  }
}
