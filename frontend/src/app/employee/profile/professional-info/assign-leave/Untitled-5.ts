import { CommonModule } from '@angular/common';
import { Component, ElementRef } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MenuItem } from './navigation';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  openMenu: string | null = null;

  constructor(private router: Router, private elRef: ElementRef) { }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
 async  ngAfterViewInit() {
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
      { title: 'Employee List', icon: 'ri-file-list-2-line', link: '/layout/employee/list' },

      { title: 'Add Employee', icon: 'ri-user-add-line', link: '/layout/employee/joining' }
    ]
  },
  {
    title: 'Employee Profile',
    icon: 'ri-user-line',
    children: [
      {
        title: 'Personal Details',
        icon: 'ri-user-3-line',
        link: '/layout/employee/profile/personal'
      },
      {
        title: 'Professional Info',
        icon: 'ri-briefcase-line',
        children: [
          {
            title: 'Qualification',
            icon: 'ri-award-line',
            link: '/layout/employee/profile/qualification'
          },
          {
            title: 'Experience',
            icon: 'ri-building-line',
            link: '/layout/employee/profile/experience'
          },
          {
            title: 'Skills',
            icon: 'ri-lightbulb-line',
            link: '/layout/employee/profile/skills'
          }
        ]
      },
      {
        title: 'Salary Structure',
        icon: 'ri-money-dollar-circle-line',
        link: '/layout/employee/profile/salary'
      },
      // {
      //   title: 'Documents',
      //   icon: 'ri-file-line',
      //   link: '/layout/employee/profile/documents'
      // }
    ]
  },
  {
    title: 'Attendance & Shift',
    icon: 'ri-calendar-check-line',
    children: [
      { title: 'Shift Master', icon: 'ri-time-line', link: '/layout/attendance/shift' },
      { title: 'Attendance Logs', icon: 'ri-clipboard-line', link: '/layout/attendance/logs' },
      { title: 'Leaves', icon: 'ri-leaf-line', link: '/layout/attendance/leaves' },
      { title: 'Attendance Master', icon: 'ri-leaf-line', link: '/layout/attendance/salary-master' }
    ]
  },
  {
    title: 'Payroll & Compensation',
    icon: 'ri-money-cny-circle-line',
    children: [
      { title: 'Full Time Salary Master', icon: 'ri-bank-card-line', link: '/layout/payroll/full-time' },
      { title: 'Part Time Salary Master', icon: 'ri-time-line', link: '/layout/payroll/part-time' },
      // { title: 'Allowances Master', icon: 'ri-gift-line', link: '/layout/payroll/allowances' },
      { title: 'Deductions', icon: 'ri-subtract-line', link: '/layout/payroll/deductions' }
    ]
  },
  {
    title: 'Reports',
    icon: 'ri-bar-chart-line',
    children: [
      { title: 'Employee Report', icon: 'ri-file-user-line', link: '/layout/reports/employee' },
      { title: 'Payroll Report', icon: 'ri-file-paper-line', link: '/layout/reports/payroll' },
      { title: 'Attendance Report', icon: 'ri-file-list-3-line', link: '/layout/reports/attendance' }
    ]
  },
  {
    title: 'Master',
    icon: 'ri-settings-3-line',
    children: [
      { title: 'Designation Master', icon: 'ri-team-line', link: '/layout/master/designation' },
      { title: 'Department Master', icon: 'ri-building-4-line', link: '/layout/master/department' },
      { title: 'Employment Type', icon: 'ri-briefcase-4-line', link: '/layout/master/employment-type' },
      {title: 'Documents', icon: 'ri-file-line', link: '/layout/master/documents'},
      // {title: 'Attendance Master', icon: 'ri-file-line', link: '/layout/master/salary-master'}

    ]
  }
];
toggleMenu(menu: any): void {
  // this.menuItems.forEach(m => {
  //   if (m !== menu) m.active = false;
  // });
  // menu.active = !menu.active;
  this.menuItems.forEach(m=>{
    if(m.title === menu.title)
      {
m.active = true;
      } else{
        m.active = false;
      }
  })
}

ngOnInit() {
  this.router.events.subscribe(event => {
    if (event instanceof NavigationEnd) {
      this.setActiveMenuItem(event.urlAfterRedirects);
    }
  });

  // Also run once on init
  this.setActiveMenuItem(this.router.url);
}
// Checks if any child in the given array is active (used in navbar.component.html)
isAnyChildActive(children: any[]): boolean {
  if (!children) return false;
  return children.some(child => child.active || (child.children && this.isAnyChildActive(child.children)));
}

// async setActiveMenuItem(currentUrl: string) {
//   const markActive = (items: MenuItem[], parentElement?: HTMLElement) => {
//     items.forEach(item => {
//       const isActive = item.link === currentUrl;
//       item.active = isActive;

//       const element = document.querySelector(`[data-menu-id="${item['id']}"]`) as HTMLElement;

//       if (item.children && item.children.length) {
//         const anyChildActive = markActive(item.children, element);
//         item.active = item.active || anyChildActive;

//         if (anyChildActive && element) {
//           element.classList.add('open'); // Open parent if child is active
//         }
//       }

//       if (isActive && parentElement) {
//         parentElement.classList.add('open'); // Open parent item
//       }
//     });

//     // Return true if any item in this level is active
//     return items.some(i => i.active);
//   };

//   markActive(this.menuItems);
// }
async setActiveMenuItem(currentUrl: string) {
  const markActive = (items: MenuItem[]): boolean => {
    let anyActive = false;

    items.forEach(item => {
      item.active = item.link === currentUrl;
      if (item.children?.length) {
        const childActive = markActive(item.children);
        item.active = item.active || childActive;
      }
      anyActive ||= item.active;
    });

    return anyActive;
  };

  markActive(this.menuItems);
}


}
