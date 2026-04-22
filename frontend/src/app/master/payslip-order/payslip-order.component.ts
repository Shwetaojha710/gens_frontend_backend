import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { SearchPaginationComponent } from '../search-pagination/search-pagination.component';

@Component({
  selector: 'app-payslip-order',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './payslip-order.component.html',
  styleUrl: './payslip-order.component.css'
})

export class PayslipOrderComponent {
  obj: any = {}
  notyf: Notyf;

dependentComp: any = []
 async getcomponentname() {

    this.dependentComp = []

    this.master.getComponent().subscribe((response: any) => {
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
  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  SalaryOrderForm!: FormGroup;
  SalaryOrderList: any = [];
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.SalaryOrderForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });

    this.notyf = new Notyf();
  }
orderedComponents: any[] = [];

onComponentChange(selected: any[]) {
  // Reset orders in the full list
  this.dependentComp = this.dependentComp.map((item:any) => ({
    ...item,
    order: null
  }));

  // Assign order to selected ones
  selected.forEach((sel, index) => {
    const match = this.dependentComp.find((x:any) => x.value === sel.value);
    if (match) {
      match.order = index + 1;
    }
  });

  // Also keep a clean selected list with order
  this.orderedComponents = selected.map((item, index) => ({
    ...item,
    order: index + 1
  }));
}


  async ngOnInit() {
    this.SalaryOrderForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    await this.getcomponentname();
    await this.getFetchPayslipOrder()
  }
  pageSize = 5;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  onSearch(term: string) {
    this.searchTerm = term.toLowerCase();
    this.currentPage = 1;
    this.applyFilters();
  }
getFetchPayslipOrder(){
 this.SalaryOrderList = []
    this.originalList = []
    this.master.getSalaryOrder().subscribe(data => {
      if (data['status'] == true) {
        this.notyf.success(data['message']);
        this.SalaryOrderList = data.data;
        this.originalList = data.data;
      } else {
        this.notyf.error(data['message']);
      }
    });
}

  onPageChange(page: number) {
    this.currentPage = page;
    this.applyFilters();
  }


  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    this.applyFilters();
  }
  filteredDesignation: any = []
  searchText: any = ''

  applyFilters() {
    let data = [...this.SalaryOrderList];


    const value = this.searchTerm || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.SalaryOrderList = [...this.originalList];
    } else {
      this.SalaryOrderList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }


    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDesignation = data.slice(start, end);
  }

  getStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
      case 'completed': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }
  originalList: any = []


  onSubmit() {
    // if (!ValidationUtil.showRequiredError('Employment Type', this.obj.name, this.notyf)) {
    //   return;
    // }


    this.master.addSalaryOrder(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.getFetchPayslipOrder();
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
        this.notyf.error(err.error?.message)
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
    this.master.updateSalaryOrder(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.getFetchPayslipOrder();
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
        this.notyf.error(err.error.message)
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
        this.deleteSalaryOrder(data)
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
  deleteSalaryOrder(data: any) {
    this.master.deleteSalaryOrder(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.getFetchPayslipOrder();
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
  isInvalid(field: string): boolean {
    const control = this.SalaryOrderForm.get(field);
    return !!(control && control.touched && control.invalid);
  }

  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  opencreate() {
    this.obj = {}
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }




}
