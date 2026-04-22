import { CommonModule } from '@angular/common';
import { Component, HostBinding } from '@angular/core';
import { NavigationEnd, Params, Router, RouterModule } from '@angular/router';

interface InterviewerMenuItem {
  title: string;
  icon: string;
  link?: string;
  queryParams?: Params;
  active?: boolean;
  open?: boolean;
  children?: InterviewerMenuItem[];
}

@Component({
  selector: 'app-interviewer-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './interviewer-navbar.component.html',
  styleUrl: './interviewer-navbar.component.css'
})
export class InterviewerNavbarComponent {
  isCollapsed = false;

  @HostBinding('style.width') get hostWidth(): string {
    return this.isCollapsed ? '84px' : '248px';
  }

  @HostBinding('style.minWidth') get hostMinWidth(): string {
    return this.isCollapsed ? '84px' : '248px';
  }

  @HostBinding('style.flex') get hostFlex(): string {
    return this.isCollapsed ? '0 0 84px' : '0 0 248px';
  }

  menuItems: InterviewerMenuItem[] = [
    {
      title: 'Dashboard',
      icon: 'ri-home-smile-line',
      link: '/interview/interviewer-dashboard'
    },
    {
      title: 'Interviews',
      icon: 'ri-calendar-schedule-line',
      link: '/interview/interviews'
    },
    {
      title: 'Candidates',
      icon: 'ri-team-line',
      link: '/interview/candidates'
    },
    {
      title: 'Feedback',
      icon: 'ri-file-list-3-line',
      link: '/interview/feedback'
    },
    // {
    //   title: 'Calendar',
    //   icon: 'ri-calendar-2-line',
    //   link: '/interview/calendar'
    // }
  ];

  constructor(private router: Router) {}

  get companyLogo(): string {
    return 'assets/img/logo/logo-quaere.png';
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setActiveMenuItem(event.urlAfterRedirects);
      }
    });

    this.setActiveMenuItem(this.router.url);
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  private setActiveMenuItem(currentUrl: string): void {
    const markActive = (items: InterviewerMenuItem[]): boolean => {
      let anyActive = false;

      items.forEach((item) => {
        item.active = this.isLinkActive(item, currentUrl);
        anyActive = anyActive || !!item.active;
      });

      return anyActive;
    };

    markActive(this.menuItems);
  }

  private isLinkActive(item: InterviewerMenuItem, currentUrl: string): boolean {
    if (!item.link) return false;

    const tree = this.router.createUrlTree([item.link], { queryParams: item.queryParams });
    return this.router.serializeUrl(tree) === currentUrl;
  }
}
