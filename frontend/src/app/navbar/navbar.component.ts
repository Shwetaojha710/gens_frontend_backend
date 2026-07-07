import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem, UserRole, APP_MENU_ITEMS } from './navigation';
import { MobileMenuService } from '../services/mobile-menu.service';
import { PermissionService } from '../services/permission.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
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

  // ── Role filter via PermissionService ─────────────────────────────────────
  private filterByRole(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => {
        if (item['permKey']) return this.permSvc.can(item['permKey'], this.userRole);
        if (item['roles']) return (item['roles'] as UserRole[]).includes(this.userRole);
        return true;
      })
      .map(item => {
        if (!item.children) return item;
        const filteredChildren = this.filterByRole(item.children);
        return { ...item, children: filteredChildren };
      })
      .filter(item => item.children === undefined || item.children.length > 0);
  }

  // ── Full menu definition (shared with header search) ─────────────────────
  private allMenuItems(): MenuItem[] {
    // Deep clone so per-instance active/open mutations don't leak into the shared constant.
    return JSON.parse(JSON.stringify(APP_MENU_ITEMS));
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
      if (item !== menu && item.children?.length) item.open = false;
    });
    menu.open = !menu.open;
  }

  isAnyChildActive(children: any[]): boolean {
    if (!children) return false;
    return children.some(child => child.active || (child.children && this.isAnyChildActive(child.children)));
  }

  async setActiveMenuItem(currentUrl: string) {
    const currentPath = currentUrl.split('?')[0];
    const markActive = (items: MenuItem[]): boolean => {
      let anyActive = false;
      items.forEach(item => {
        item.active = item.link === currentPath;
        if (item.children?.length) {
          const childActive = markActive(item.children);
          item.active = item.active || childActive;
          item.open = childActive;
        }
        anyActive ||= item.active;
      });
      return anyActive;
    };
    markActive(this.menuItems);
  }
}
