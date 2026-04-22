import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { StatusService } from '../../../../services/status.service';
import { ValidationUtil } from '../../../../shared/utils/validation.util';
import { EmployeeService } from '../../../../services/employee.service';
import { DataService } from '../../../../services/data.service';

@Component({
  selector: 'app-experience',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './experience.component.html',
  styleUrl: './experience.component.css'
})

export class ExperienceComponent {
  obj: any = {}
  notyf: Notyf;
   minDate: any
  desigantionList: any = []
  personalDetails: any = []
  constructor(public empService: EmployeeService, private router: Router, public statusService: StatusService, public dataService: DataService) {
    this.notyf = new Notyf();

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');



  }
  departmentDD: any = []
  async ngOnInit() {
    // await this.experiencedd()
    await this.fetchexperience()

  }
setMinToDate(){
  if (this.obj?.from) {
  const fromDate = new Date(this.obj.from);

  if (!isNaN(fromDate.getTime())) {  // ✅ valid date check
    this.minDate = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}

}


  async back() {
    this.obj = {}
    this.createFlag = false
    await this.fetchexperience()
  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  onSubmit() {
    console.log(this.obj)
    // if (!ValidationUtil.showRequiredError('experience name', this.obj.name, this.notyf)) {
    //   return;
    // }
    // if (!ValidationUtil.showRequiredError('Department', this.obj['department'], this.notyf)) {
    //   return;
    // }
    this.obj['employeeId'] = this.personalDetails.id
    this.empService.addexperience(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.notyf.success(message)

          this.back()
        }
        else if (status === "expired") {
            this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err?.error?.message)
      }
    });




  }
  async fetchexperience() {
    let obj: any = {}
    obj['employeeId'] = this.personalDetails.id
    this.desigantionList = []
    this.empService.getexperiences(obj).subscribe(data => {
      let message = data.message ? data.message : 'Data found Successfully';
      let status = this.statusService.handleResponseStatus(data.status, message);

      if (status == true) {
        this.desigantionList = []
        // this.notyf.success(data['message']);
        this.desigantionList = data.data;
      } else {
        this.notyf.error(data['message']);
      }
    });
  }
  getStatusClass(status: any): string {
    switch (status) {
      case 'pending': return 'bg-light-warning';
      case 'cancelled': return 'bg-light-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  editingId: any
  opencreate() {
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }

  update(dept: any) {
    this.obj = Object.assign({}, dept)
    this.obj['from'] = this.obj['from']?.split(' ')[0]
    this.obj['to'] = this.obj['to']?.split(' ')[0]
    this.editingId = this.obj.id;
    this.createFlag = true
    this.updateFlag = true
    this.setMinToDate()
  }
  UpdateData() {
    this.obj['id'] = this.editingId
    this.obj['employeeId'] = this.personalDetails.id
    this.empService.updateexperience(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchexperience();
          this.resetForm();
        }
        else if (status === "expired") {
            this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message)
        }
      },
      error: (err: any) => {
        console.error('Error:', err);
        this.notyf.error(err.error.message)
      }



    })

  }
  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
  }
  delete(id: any) {


    Swal.fire({
      title: "Are you sure?",
      text: "Do you Want to Delete this",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteexperience(id)
        // Swal.fire({
        //   title: "Deleted!",
        //   text: "Your file has been deleted.",
        //   icon: "success"
        // });
      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {
        // Swal.fire({
        //   title: "Cancelled",
        //   text: "Your imaginary file is safe :)",
        //   icon: "error"
        // });
      }
    });


  }
   getToDateMin(): string {
    return this.obj['fromDate'] || this.minDate;
  }
  deleteexperience(id: any) {
    let obj: any = {}
    obj['id'] = id
    obj['employeeId'] = this.personalDetails.id
    this.empService.deleteexperience(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchexperience();
        }
        else if (status === "expired") {
            this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message)
        }
      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err?.error?.message)
      }

    })
  }
}

