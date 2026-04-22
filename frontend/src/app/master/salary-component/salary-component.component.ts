import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { Router } from '@angular/router';

@Component({
  selector: 'app-salary-component',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './salary-component.component.html',
  styleUrl: './salary-component.component.css'
})

export class SalaryComponentComponent {
  obj: any = {}
  notyf: Notyf;
  valueType: any = [{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }, { value: 'basic_dependent', label: 'Basic Dependent' }, { value: 'is_special', label: 'Is Special' }]
  componentType: any = [{ value: 'payable', label: 'Earning' }, { value: 'deductible', label: 'Deduction' }]
  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  departmentForm!: FormGroup;
  SalaryComponentList: any[] = [];
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private masterService: MasterService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.departmentForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });

    this.notyf = new Notyf();
  }
  searchText: any = '';
  async ngOnInit() {
    await this.fetchComponentMaster()
    await this.getcomponentname()

  }
 getLabel(list: any[], value: string | string[]): string {
  if (Array.isArray(value)) {
    // map each id to label
    return value
      .map(v => list.find(x => x.value === v)?.label || v)
      .join(", ");
  } else {
    // single value
    return list.find(x => x.value === value)?.label || value;
  }
}

  dependentComp: any = []
  async getcomponentname() {

    this.dependentComp = []

    this.masterService.getComponent().subscribe((response: any) => {
      if (response.status == true) {

        this.dependentComp = response.data.map((item: any) => {
          return { value: item.id, label: item.component_name,listLabel: `${item.component_name}- (${item.component_type})` }
        })
      } else if (response.status == "expired") {
          this.router.navigate(["login"]);
      } else {
        this.notyf.error(response.message)
      }

    })
  }
  applyFilter(event: any) {
    const value = event?.target?.value || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.SalaryComponentList = [...this.originalList];
    } else {
      this.SalaryComponentList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }


  }
  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }
  onItemsPerPageChange(event: any) {
    this.itemsPerPage = +event.target.value;
    this.currentPage = 1; // Reset to first page
    this.fetchComponentMaster();
  }
  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.fetchComponentMaster();
  }
  getStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
  originalList: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;

  async fetchComponentMaster() {
    this.SalaryComponentList = []
    this.originalList = []
    this.masterService.fetchComponentsMaster().subscribe(data => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.SalaryComponentList = data.data;
        this.originalList = this.SalaryComponentList
      }
      else if (data['status'] == "expired") {
          this.router.navigate(["login"]);
      }
      else {
        this.notyf.error(data['message']);
      }
    });


  }

  onSubmit() {
    if (!ValidationUtil.showRequiredError('Component name', this.obj.component_name, this.notyf)) {
      return;
    }


    this.masterService.addComponent(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchComponentMaster();
          this.resetForm();
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

  update(dept: any) {
    this.obj = Object.assign({}, dept)
    this.editingId = this.obj.id;
    this.createFlag = true
    this.updateFlag = true
  }
  updatedata() {
    this.masterService.updateSalaryComponent(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchComponentMaster();
          this.resetForm();
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
        this.notyf.error(err?.error?.message || err?.message)
   }



    })

  }

  delete(data: number) {

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
        this.deleteSalaryComponent(data)
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
  deleteSalaryComponent(data: any) {
    this.masterService.deleteSalaryComponent(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchComponentMaster();
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
        this.notyf.error(err.message)
      }

    })
  }

  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
  }
  isInvalid(field: string): boolean {
    const control = this.departmentForm.get(field);
    return !!(control && control.touched && control.invalid);
  }

  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  opencreate() {
    this.obj = {}
    this.dependentComp = []
    this.getcomponentname()
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }
  percentageFlag: boolean = false
  fixedFlag: boolean = true
  onChange(event: any) {
    console.log(event)

    if (event.value == 'fixed') {
      this.obj['dependent_component'] = null
    }
    else if (event.value == 'basic_dependent') {
      this.obj['dependent_component'] = null
      this.obj['amount'] = null
      this.obj['value'] = null
    }
    else {

      this.obj['amount'] = null
      this.obj['value'] = null
    }
  }

}
