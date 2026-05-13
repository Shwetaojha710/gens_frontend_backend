import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem } from './navigation';
import { MobileMenuService } from '../services/mobile-menu.service';

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
    // Force Angular change detection on resize so HostBindings re-evaluate
    if (!this.isMobile) {
      this.isMobileOpen = false;
    }
  }

  constructor(
    private router: Router,
    private elRef: ElementRef,
    private mobileMenu: MobileMenuService
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.mobileMenu.open$.subscribe(open => {
        this.isMobileOpen = open;
        // Prevent body scroll when drawer is open
        document.body.style.overflow = open ? 'hidden' : '';
      })
    );

    this.sub.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuItem(event.urlAfterRedirects);
          // Close mobile drawer on navigation
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

  menuItems: MenuItem[] = [
    {
      title: 'Dashboards',
      icon: 'ri-home-smile-line',
      active: true,
      link: '/layout/dashboard'
    },
    {
      title: 'Employee Management',
      icon: 'ri-layout-2-line',
      children: [
        { title: 'Add Employee',  icon: 'ri-user-add-line',         link: '/layout/employee/joining' },
        { title: 'Apply Leave',   icon: 'ri-file-list-2-line',      link: '/layout/employee/apply-leave' },
        { title: 'All Letters',   icon: 'ri-file-paper-2-line',     link: '/layout/employee/all-letters' },
      ]
    },
    {
      title: 'Attendance & Shift',
      icon: 'ri-calendar-check-line',
      children: [
        { title: 'Shift Master',            icon: 'ri ri-user-3-line',        link: '/layout/attendance/shift' },
        { title: 'Date Wise Attendance',    icon: 'ri-calendar-line',         link: '/layout/attendance/date-wise-attendance' },
        { title: 'Holiday',                 icon: 'ri-barricade-fill',        link: '/layout/attendance/holiday' },
        { title: 'Attendance Logs',         icon: 'ri-calendar-line',         link: '/layout/attendance/logs' },
        { title: 'Leaves',                  icon: 'ri-leaf-line',             link: '/layout/attendance/leaves' },
        { title: 'Upload Attendance',       icon: 'ri-upload-cloud-line',     link: '/layout/attendance/upload-attendance' },
        { title: 'Regularize',              icon: 'ri-upload-cloud-line',     link: '/layout/attendance/regularize' },
        { title: 'Weekend Employee List',   icon: 'ri-upload-cloud-line',     link: '/layout/attendance/weekend-emp-list' },
        { title: 'Add Comp Off',            icon: 'ri-upload-cloud-line',     link: '/layout/attendance/add-comp-off' },
        { title: 'Contractual Approval',    icon: 'ri-checkbox-circle-line',  link: '/layout/attendance/contractual-approval' }
      ]
    },
    {
      title: 'Payroll & Compensation',
      icon: 'ri-money-cny-circle-line',
      children: [
        { title: 'Generate Salary',       icon: 'ri-money-rupee-circle-line', link: '/layout/payroll/full-time' },
        { title: 'Generated Salary List', icon: 'ri-suitcase-line',           link: '/layout/payroll/generated-salary' },
        { title: 'Deduction Summary',     icon: 'ri-subtract-line',           link: '/layout/payroll/deduction-summary' },
        { title: 'Reimbursement',         icon: 'ri-refund-line',             link: '/layout/payroll/reimbursement' },
      ]
    },
    {
      title: 'Reports',
      icon: 'ri-bar-chart-line',
      children: [
        { title: 'Employee Report',    icon: 'ri-file-user-line',    link: '/layout/reports/employee' },
        { title: 'Payroll Report',     icon: 'ri-file-paper-line',   link: '/layout/reports/payroll' },
        { title: 'Late Arrival Report',icon: 'ri-file-list-3-line',  link: '/layout/reports/attendance' },
        { title: 'Tracking Report',    icon: 'ri-file-list-3-line',  link: '/layout/reports/tracking-report' },
      ]
    },
    {
      title: 'Master',
      icon: 'ri-settings-3-line',
      children: [
        { title: 'Designation Master', icon: 'ri-team-line',          link: '/layout/master/designation' },
        { title: 'Department Master',  icon: 'ri-building-4-line',    link: '/layout/master/department' },
        { title: 'Employment Type',    icon: 'ri-briefcase-4-line',   link: '/layout/master/employment-type' },
        { title: 'Documents',          icon: 'ri-file-text-line',     link: '/layout/master/documents' },
        { title: 'Holiday Types',      icon: 'ri-suitcase-line',      link: '/layout/master/holiday-type' },
        { title: 'Salary Component',   icon: 'ri-wallet-2-line',      link: '/layout/master/salary-component' },
        { title: 'Pay Slip Setup',     icon: 'ri-file-pdf-2-line',    link: '/layout/master/pay-slip' },
        { title: 'Branch',             icon: 'ri-file-pdf-2-line',    link: '/layout/master/branch' },
      ]
    },
    {
      title: 'Setting',
      icon: 'ri-settings-3-line',
      children: [
        { title: 'Attendance Master', icon: 'ri-calendar-line',     link: '/layout/attendance/salary-master' },
        { title: 'Currency',          icon: 'ri-copper-coin-line',  link: '/layout/master/currency' },
        { title: 'Company Prefix',    icon: 'ri-info-card-line',    link: '/layout/master/prefix' },
        { title: 'Brand & Colors',    icon: 'ri-palette-line',      link: '/layout/master/brand-colors' },
      ]
    },
  ];

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
    const markActive = (items: MenuItem[]): boolean => {
      let anyActive = false;
      items.forEach(item => {
        item.active = item.link === currentUrl;
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
