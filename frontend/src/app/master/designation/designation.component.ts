import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import 'notyf/notyf.min.css';
import { INotyfNotificationOptions, Notyf } from 'notyf';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ValidationUtil } from '../../shared/utils/validation.util';
import Swal from 'sweetalert2';
import { SearchPaginationComponent } from '../search-pagination/search-pagination.component';
@Component({
  selector: 'app-designation',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './designation.component.html',
  styleUrl: './designation.component.css'
})
export class DesignationComponent {
  obj: any = {}
  notyf: Notyf;
  desigantionList: any = []
  constructor(public master: MasterService, private router: Router, public statusService: StatusService) {
    this.notyf = new Notyf();
  }
  departmentDD: any = []
  async ngOnInit() {
    await this.designationdd()
    await this.fetchdesignation()

  }
  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  onSearch(term: string) {
    this.searchTerm = term.toLowerCase();
    this.currentPage = 1;
    this.applyFilters();
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

  // applyFilters() {
  //   let data = [...this.desigantionList];


  //   const value = this.searchTerm || '';
  //   this.searchText = value.trim();

  //   if (this.searchText === '') {
  //     this.desigantionList = [...this.originalList];
  //   } else {
  //     this.desigantionList = this.originalList.filter((item: any) =>
  //       JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
  //     );
  //   }


  //   // pagination
  //   const start = (this.currentPage - 1) * this.pageSize;
  //   const end = start + this.pageSize;
  //   this.filteredDesignation = data.slice(start, end);
  // }
   applyFilters() {
    let data = [...this.desigantionList];
    const value = this.searchTerm || '';
    this.searchText = value.trim();
    if (this.searchText === '') {
      this.desigantionList = [...this.originalList];
    } else {
      this.desigantionList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDesignation = data.slice(start, end);
  }
  async designationdd() {
    this.departmentDD = []
    let obj:any={}

    this.master.Departmentsdd(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        // let status = this.statusService.handleResponseStatus(response.status, message);
        // console.log(status)
        // console.log("response", response);

        if (response.status === true) {
          this.departmentDD = response.data;
          // this.notyf.success(message)

          this.back()
        }
        else if (response.status === "expired") {
            this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err)
      }
    });
  }

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  onSubmit() {
    console.log(this.obj)
    if (!ValidationUtil.showRequiredError('Designation name', this.obj.name, this.notyf)) {
      return;
    }
    if (!ValidationUtil.showRequiredError('Department', this.obj['department'], this.notyf)) {
      return;
    }

    this.master.adddesignation(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.notyf.success(message)

          this.back()
            this.fetchdesignation()
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
    });




  }
  originalList: any = []
  async fetchdesignation() {
    this.desigantionList = []
    this.originalList = []
    this.master.getDesignations().subscribe(data => {
      let message = data.message ? data.message : 'Data found Successfully';
      let status = this.statusService.handleResponseStatus(data.status, message);

      if (status == true) {
        this.desigantionList = []
        // this.notyf.success(data['message']);

        data.data =data.data.map((item: any, index: any) => {
          return {
            ...item,
            si_no: index + 1,
          }
        })
        this.desigantionList = data.data;
        this.originalList = data.data;
         // pagination
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.filteredDesignation = this.desigantionList.slice(start, end);
      } else {
        this.notyf.error(data['message']);
      }
    });


  }
  getStatusClass(status: any): string {
    switch (status) {
      case 'active': return 'badge-outline-success';
      case 'inactive': return 'badge-outline-danger';
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
    this.master.updatedesignation(this.editingId, this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchdesignation();
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
        this.deleteDesignation(id)
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
  deleteDesignation(id: any) {
    let obj: any = {}
    obj['id'] = id

    this.master.deletedesignation(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchdesignation();
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
}
