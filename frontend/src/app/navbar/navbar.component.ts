import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem, UserRole } from './navigation';
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

  // ── Full menu definition ──────────────────────────────────────────────────
  private allMenuItems(): MenuItem[] {
    return [
      {
        title: 'Dashboards',
        icon: 'ri-home-smile-line',
        active: true,
        link: '/layout/dashboard',
        permKey: 'dashboard',
      },
      {
        title: 'Employee Management',
        icon: 'ri-layout-2-line',
        permKey: 'emp-mgmt',
        children: [
          { title: 'Add Employee',  icon: 'ri-user-add-line',     link: '/layout/employee/joining',     permKey: 'emp-mgmt.add' },
          { title: 'Apply Leave',   icon: 'ri-file-list-2-line',  link: '/layout/employee/apply-leave', permKey: 'emp-mgmt.leave' },
          { title: 'All Letters',   icon: 'ri-file-paper-2-line', link: '/layout/employee/all-letters', permKey: 'emp-mgmt.letters' },
        ]
      },
      {
        title: 'Attendance & Shift',
        icon: 'ri-calendar-check-line',
        permKey: 'attendance',
        children: [
          { title: 'Shift Master',            icon: 'ri-user-3-line',          link: '/layout/attendance/shift',                permKey: 'att.shift' },
          { title: 'Date Wise Attendance',    icon: 'ri-calendar-line',        link: '/layout/attendance/date-wise-attendance', permKey: 'att.datewise' },
          { title: 'Holiday',                 icon: 'ri-barricade-fill',       link: '/layout/attendance/holiday',              permKey: 'att.holiday' },
          { title: 'Attendance Logs',         icon: 'ri-calendar-line',        link: '/layout/attendance/logs',                 permKey: 'att.logs' },
          { title: 'Leaves',                  icon: 'ri-leaf-line',            link: '/layout/attendance/leaves',               permKey: 'att.leaves' },
          { title: 'Upload Attendance',       icon: 'ri-upload-cloud-line',    link: '/layout/attendance/upload-attendance',    permKey: 'att.upload' },
          { title: 'Regularize',              icon: 'ri-upload-cloud-line',    link: '/layout/attendance/regularize',           permKey: 'att.regularize' },
          { title: 'Weekend Employee List',   icon: 'ri-upload-cloud-line',    link: '/layout/attendance/weekend-emp-list',     permKey: 'att.weekend' },
          { title: 'Add Comp Off',            icon: 'ri-upload-cloud-line',    link: '/layout/attendance/add-comp-off',         permKey: 'att.compoff' },
          { title: 'Contractual Approval',    icon: 'ri-checkbox-circle-line', link: '/layout/attendance/contractual-approval', permKey: 'att.contractual' },
        ]
      },
      {
        title: 'Payroll & Compensation',
        icon: 'ri-money-cny-circle-line',
        permKey: 'payroll',
        children: [
          { title: 'Generate Salary',       icon: 'ri-money-rupee-circle-line', link: '/layout/payroll/full-time',         permKey: 'pay.generate' },
          { title: 'Generated Salary List', icon: 'ri-suitcase-line',           link: '/layout/payroll/generated-salary',  permKey: 'pay.list' },
          { title: 'Deduction Summary',     icon: 'ri-subtract-line',           link: '/layout/payroll/deduction-summary', permKey: 'pay.deduction' },
          { title: 'Reimbursement',         icon: 'ri-refund-line',             link: '/layout/payroll/reimbursement',     permKey: 'pay.reimburse' },
        ]
      },
      {
        title: 'Reports',
        icon: 'ri-bar-chart-line',
        permKey: 'reports',
        children: [
          { title: 'Employee Report',     icon: 'ri-file-user-line',   link: '/layout/reports/employee',         permKey: 'rep.employee' },
          { title: 'Payroll Report',      icon: 'ri-file-paper-line',  link: '/layout/reports/payroll',          permKey: 'rep.payroll' },
          { title: 'Late Arrival Report', icon: 'ri-file-list-3-line', link: '/layout/reports/attendance',       permKey: 'rep.late' },
          { title: 'Tracking Report',     icon: 'ri-file-list-3-line', link: '/layout/reports/tracking-report',  permKey: 'rep.tracking' },
        ]
      },
      {
        title: 'Master',
        icon: 'ri-settings-3-line',
        permKey: 'master',
        children: [
          { title: 'Designation Master', icon: 'ri-team-line',        link: '/layout/master/designation',      permKey: 'master.designation' },
          { title: 'Department Master',  icon: 'ri-building-4-line',  link: '/layout/master/department',       permKey: 'master.department' },
          { title: 'Employment Type',    icon: 'ri-briefcase-4-line', link: '/layout/master/employment-type',  permKey: 'master.emptype' },
          { title: 'Documents',          icon: 'ri-file-text-line',   link: '/layout/master/documents',        permKey: 'master.docs' },
          { title: 'Holiday Types',      icon: 'ri-suitcase-line',    link: '/layout/master/holiday-type',     permKey: 'master.holidaytype' },
          { title: 'Salary Component',   icon: 'ri-wallet-2-line',    link: '/layout/master/salary-component', permKey: 'master.salary' },
          { title: 'Pay Slip Setup',     icon: 'ri-file-pdf-2-line',  link: '/layout/master/pay-slip',         permKey: 'master.payslip' },
          { title: 'Branch',             icon: 'ri-file-pdf-2-line',  link: '/layout/master/branch',           permKey: 'master.branch' },
          // { title: 'LetterHead',             icon: 'ri-file-pdf-2-line',  link: '/layout/master/letterhead',           permKey: 'master.letterhead' },
        ]
      },
      {
        title: 'Setting',
        icon: 'ri-settings-3-line',
        permKey: 'setting',
        children: [
          { title: 'Attendance Master', icon: 'ri-calendar-line',          link: '/layout/attendance/salary-master',  permKey: 'set.attmaster' },
          { title: 'Currency',          icon: 'ri-copper-coin-line',       link: '/layout/master/currency',           permKey: 'set.currency' },
          { title: 'Company Prefix',    icon: 'ri-info-card-line',         link: '/layout/master/prefix',             permKey: 'set.prefix' },
          { title: 'Brand & Colors',    icon: 'ri-palette-line',           link: '/layout/master/brand-colors',       permKey: 'set.brand' },
          { title: 'Company Letterhead', icon: 'ri-file-paper-line',       link: '/layout/master/letterhead',         permKey: 'set.brand' },
          { title: 'Role Permissions',  icon: 'ri-shield-keyhole-line', link: '/layout/master/role-permission', permKey: 'set.roleperm' },
          { title: 'User Permissions',  icon: 'ri-user-settings-line',  link: '/layout/master/user-permission', permKey: 'set.userperm' },
          { title: 'My Sidebar Access', icon: 'ri-eye-line',            link: '/layout/master/user-access',     permKey: 'set.sidebaraccess' },
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
