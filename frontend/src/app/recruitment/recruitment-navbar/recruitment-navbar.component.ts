import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostBinding } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { MenuItem } from './recuirtment-navigation';

@Component({
  selector: 'app-recruitment-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recruitment-navbar.component.html',
  styleUrls: ['./recruitment-navbar.component.css']
})
export class RecruitmentNavbarComponent {
  openMenu: string | null = null;
  isCollapsed = false;

  @HostBinding('style.width') get hostWidth(): string {
    return this.isCollapsed ? '84px' : '248px';
  }

  @HostBinding('style.minWidth') get hostMinWidth(): string {
    return this.isCollapsed ? '84px' : '248px';
  }

  @HostBinding('style.flex')
  get hostFlex(): string {
    return this.isCollapsed ? '0 0 84px' : '0 0 248px';
  }

  constructor(private router: Router, private elRef: ElementRef) {}

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  get companyLogo(): string {
    return 'assets/img/logo/logo-quaere.png';
  }

  async ngAfterViewInit() {
    const items = document.querySelectorAll('.menu-item');
    items.forEach((item: Element) => {
      item.addEventListener('mouseenter', () => {
        item.classList.add('open');
      });

      item.addEventListener('mouseleave', () => {
        item.classList.remove('open');
      });
    });
  }

  menuItems: MenuItem[] = [

    // {
    //   title: 'Interviewer Dashboard',
    //   icon: 'ri-home-smile-line',
    //   active: true,
    //   link: '/interview/interviewer-dashboard'
    // },

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
        { title: 'Job Requirement Analysis', icon: 'ri-user-add-line', link: '/recruitment/jobs/job-requirement' },
        { title: 'Job Posting & Sourcing', icon: 'ri-user-add-line', link: '/recruitment/jobs/posting-sourcing' },
        // { title: 'Candidate Pipeline', icon: 'ri-profile-line', link: '/recruitment/pipeline' }
      ]
    },
    {
      title: 'Candidate Management',
      icon: 'ri-layout-2-line',
      children: [
        { title: 'Candidate Application', icon: 'ri-profile-line', link: '/recruitment/application-list' },
        { title: 'Offered Candidate List', icon: 'ri-hand-coin-line', link: '/recruitment/offered-candidate-list' },
        { title: 'Generate Offer Letter', icon: 'ri-file-text-line', link: '/recruitment/offers/offer-letter' }
      ]
    },
    {
      title: '  Interview Management',
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
        { title: 'Round Type', icon: 'ri-building-4-line', link: '/recruitment/master/round-type' },
        { title: 'Department', icon: 'ri-community-line', link: '/recruitment/master/department' },
        { title: 'Designation', icon: 'ri-award-line', link: '/recruitment/master/designation' }
      ]
    }
  ];

    goToRecruitmentDashboard() {
    this.router.navigate(['landing-home']);
  }

  toggleItem(menu: MenuItem): void {
    if (this.isCollapsed) {
      return;
    }

    this.menuItems.forEach((item) => {
      if (item !== menu && item.children?.length) {
        item['open'] = false;
      }
    });

    menu['open'] = !menu['open'];
  }

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setActiveMenuItem(event.urlAfterRedirects);
      }
    });

    this.setActiveMenuItem(this.router.url);
  }

  isAnyChildActive(children: any[]): boolean {
    if (!children) return false;
    return children.some((child) => child.active || (child.children && this.isAnyChildActive(child.children)));
  }

  async setActiveMenuItem(currentUrl: string) {
    const markActive = (items: MenuItem[]): boolean => {
      let anyActive = false;

      items.forEach((item) => {
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
