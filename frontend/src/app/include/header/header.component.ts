import { Component, ElementRef, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Notyf } from 'notyf';
import { Router } from '@angular/router';
import { MasterService } from '../../services/master.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NgSelectModule, FormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  notyf: Notyf = new Notyf();
  tenantDetails:any={}
  baseurl:any
  constructor(private auth: AuthService, private router: Router, private eRef: ElementRef, public masterService: MasterService) {
    this.getBranchDD()
      this.baseurl = this.masterService.getBaseUrl();
    this.obj.branchId = localStorage.getItem('branchId') || '';
     this.tenantDetails=JSON.parse(localStorage.getItem('tenant') || '{}');
     this.tenantDetails.image=`${this.baseurl}${this.tenantDetails['image']}`
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
    }
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
    const currentUrl = this.router.url;
    return !currentUrl.startsWith('/recruitment') && !currentUrl.startsWith('/layout/employee');
  }
}
