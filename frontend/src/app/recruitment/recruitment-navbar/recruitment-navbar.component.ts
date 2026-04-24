import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuItem } from './recuirtment-navigation';
import { MobileMenuService } from '../../services/mobile-menu.service';

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
    private mobileMenu: MobileMenuService
  ) {}

  ngOnInit(): void {
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
      title: 'Dashboard',
      icon: 'ri-home-smile-line',
      active: true,
      link: '/recruitment/recruitment-dashboard'
    },
    {
      title: 'Recruitment Analysis',
      icon: 'ri-layout-2-line',
      children: [
        { title: 'Job Requirement Analysis', icon: 'ri-user-add-line',  link: '/recruitment/jobs/job-requirement' },
        { title: 'Job Posting & Sourcing',   icon: 'ri-user-add-line',  link: '/recruitment/jobs/posting-sourcing' },
      ]
    },
    {
      title: 'Candidate Management',
      icon: 'ri-layout-2-line',
      children: [
        { title: 'Candidate Application',  icon: 'ri-profile-line',    link: '/recruitment/application-list' },
        { title: 'Offered Candidate List', icon: 'ri-hand-coin-line',  link: '/recruitment/offered-candidate-list' },
        { title: 'Generate Offer Letter',  icon: 'ri-file-text-line',  link: '/recruitment/offers/offer-letter' }
      ]
    },
    {
      title: 'Interview Management',
      icon: 'ri-layout-2-line',
      children: [
        { title: 'Add User', icon: 'ri-profile-line', link: '/recruitment/user' }
      ]
    },
    {
      title: 'Master',
      icon: 'ri-settings-3-line',
      children: [
        { title: 'Interview Round', icon: 'ri-building-4-line', link: '/recruitment/master/interview-round' },
        { title: 'Round Type',      icon: 'ri-building-4-line', link: '/recruitment/master/round-type' },
        { title: 'Department',      icon: 'ri-community-line',  link: '/recruitment/master/department' },
        { title: 'Designation',     icon: 'ri-award-line',      link: '/recruitment/master/designation' }
      ]
    }
  ];

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
