import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { SearchPaginationComponent } from '../../../master/search-pagination/search-pagination.component';
import { MasterService } from '../../../services/master.service';
import { StatusService } from '../../../services/status.service';
import { ValidationUtil } from '../../../shared/utils/validation.util';
import { InterviewService } from '../../../services/interview.service';

@Component({
  selector: 'app-interview-rounds',
   imports: [NgSelectModule,
    FormsModule, CommonModule,SearchPaginationComponent],
  templateUrl: './interview-rounds.component.html',
  styleUrl: './interview-rounds.component.css'
})
// export class InterviewRoundsComponent {

// }
export class InterviewRoundsComponent {
  obj: any = {}
  notyf: Notyf;

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  CurrencyForm!: FormGroup;
  CurrencyList:any = [];
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private interviewService : InterviewService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.CurrencyForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });

    this.notyf = new Notyf();
  }

  async ngOnInit() {
    this.CurrencyForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    await this.roundTypeList();

    await this.fetchCurrency();
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
originalList:any = []
  applyFilters() {
    let data = [...this.CurrencyList];


    const value = this.searchTerm || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.CurrencyList = [...this.originalList];
    } else {
      this.CurrencyList = this.originalList.filter((item: any) =>
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

  async fetchCurrency() {
    this.CurrencyList = []
    this.interviewService.getInterviewRound().subscribe(data => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
      this.CurrencyList = data.data.map((item: any, index: number) => ({
  ...item,
  si_no: index + 1,
  roundTypeData: {
    id: item['roundTypeData.id'],
    name: item['roundTypeData.name']
  }
}));
this.originalList = [...this.CurrencyList];

      } else {
        this.notyf.error(data['message']);
      }
    });


  }
  roundType:any=[]
  async roundTypeList() {
    this.roundType = []
    this.interviewService.listRoundTypesDD().subscribe(data => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.roundType = data.data;


      } else {
        this.notyf.error(data['message']);
      }
    });


  }

  onSubmit() {
    // if (!ValidationUtil.showRequiredError('Currency name', this.obj.name, this.notyf)) {
    //   return;
    // }


    this.interviewService.addInterviewRound(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchCurrency();
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
    this.interviewService.updateInterviewRound(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchCurrency();
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
        this.deleteInterviewRound(data)
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
  deleteInterviewRound(data:any){
       this.interviewService.deleteInterviewRound(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchCurrency();
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
    const control = this.CurrencyForm.get(field);
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
