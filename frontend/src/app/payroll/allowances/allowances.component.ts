import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { DataService } from '../../services/data.service';
import { EmployeeService } from '../../services/employee.service';
import { StatusService } from '../../services/status.service';
import { PayrollService } from '../../services/payroll.service';

@Component({
  selector: 'app-allowances',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './allowances.component.html',
  styleUrl: './allowances.component.css'
})

export class AllowancesComponent {
  obj: any = {}
  notyf: Notyf;
  desigantionList: any = []
  personalDetails: any = []
  constructor(public empService: EmployeeService, private router: Router, public statusService: StatusService, public dataService: DataService, public payrollService: PayrollService) {
    this.notyf = new Notyf();

     this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
  }
  type: any = [{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]
  departmentDD: any = []
  async ngOnInit() {
    // await this.experiencedd()
    await this.getallowances()
    await this.getcomponentname()

  }
 component:any=[]
 async getcomponentname(){
  let obj:any ={}
   this.component=[]
  obj['employeeId']=this.personalDetails.id
    this.empService.getcomponent(obj).subscribe((response: any) => {
      if(response.status==true){
        this.component=[response.data]
      }

      })
  }
  filledAmount(dependentId:any){
const matchedItem = this.component.find((item: any) => item.value === dependentId);

if (matchedItem) {
  this.obj['amount'] = matchedItem.finalAmount;
}


// this.component.fi((item:any)=>item.value == dependentId)
console.log(this.obj['amount'],"amount valueee")
  }

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]
  onSubmit() {
    console.log(this.obj)
    // if (!ValidationUtil.showRequiredError('Basic name', this.obj.name, this.notyf)) {
    //   return;
    // }
    // if (!ValidationUtil.showRequiredError('Department', this.obj['department'], this.notyf)) {
    //   return;
    // }
    this.obj['employeeId'] = this.personalDetails.id
    this.payrollService.createAllowance(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.notyf.success(message)
          this.getallowances()
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
      }
    });




  }
  async getallowances() {
    let obj: any = {}
    obj['employeeId'] = this.personalDetails.id
    this.desigantionList = []
    this.payrollService.getAllowance(obj).subscribe(data => {
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
    this.editingId = this.obj.id;
    this.createFlag = true
    this.updateFlag = true
  }
  updatedata() {
    this.obj['id'] = this.editingId
    this.obj['employeeId'] = this.personalDetails.id
    this.payrollService.updateAllowance(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.getallowances();
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
        this.deleteallownaces(id)
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
  deleteallownaces(id: any) {
    let obj: any = {}
    obj['id'] = id

    this.payrollService.deleteAllowance(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.getallowances();
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
        this.notyf.error(err?.message)
      }

    })
  }

  calculateamt() {
    this.obj['finalAmount'] = (this.obj['amount'] * this.obj['typeValue']) / 100

  }
  dependentStatus: any = false
  managestatus() {
    if (this.obj['type'] == 'percentage') {
      this.dependentStatus = true
    } else {
      this.dependentStatus = false
    }
  }

}
