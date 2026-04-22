import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { DomSanitizer } from '@angular/platform-browser';
import * as bootstrap from 'bootstrap';
import { PayrollService } from '../../services/payroll.service';
@Component({
  selector: 'app-reimbursement',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent],
  templateUrl: './reimbursement.component.html',
  styleUrl: './reimbursement.component.css'
})
// export class ReimbursementComponent {

// }

export class ReimbursementComponent {
  obj: any = {}
  notyf: Notyf;
  @ViewChild('fileInput') fileInput!: ElementRef;

  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'active', label: 'ACTIVE' }, { value: 'inactive', label: 'INACTIVE' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  minDate: any
  ReimbursementForm!: FormGroup;
  ReimbursementList: any = [];
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
    private sanitizer: DomSanitizer,
    public payroll: PayrollService
  ) {
    this.ReimbursementForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
  }
  baseurl: any;
  async ngOnInit() {
    this.baseurl = this.master.getBaseUrl();
    await this.empList();
    await this.fetchReimbursement();
  }
  EmpList: any = []
  async empList() {
    this.EmpList = []
    this.master.getemployeeList().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.EmpList = data.data;
        this.EmpList = this.EmpList.filter((item: any) => item.label != 'All')

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }
  isFileInvalid: boolean = false;
  selectedFiles: File[] = [];
  previewFiles: { url: any; type: string; name: string }[] = [];
  sanitizedImage: any;


  // onFileChange(event: any) {
  //   const file = event.target.files[0];
  //   if (!file) {
  //     this.isFileInvalid = true;
  //     return;
  //   } else {
  //     this.isFileInvalid = false;
  //     this.selectedFile = event.target.files[0];
  //   }


  //   const reader = new FileReader();
  //   reader.onload = () => {
  //     const imageUrl = reader.result as string;
  //     this.sanitizedImage = this.sanitizer.bypassSecurityTrustUrl(imageUrl);
  //   };
  //   reader.readAsDataURL(file);
  // }
  getToDateMin(): string {
    return this.obj['fromDate'] || this.minDate;
  }
  close() {
    this.sanitizedImage = null;
    this.selectedFiles = [];
    this.isFileInvalid = false;
    this.fileInput.nativeElement.value = '';
    this.obj.image = null
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

  applyFilters() {
    let data = [...this.ReimbursementList];


    const value = this.searchTerm || '';
    this.searchText = value.trim();

    if (this.searchText === '') {
      this.ReimbursementList = [...this.originalList];
    } else {
      this.ReimbursementList = this.originalList.filter((item: any) =>
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
  isExcel(mimeType: string): boolean {
    return (
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }

  onFileChange(event: any) {
    const files = event.target.files as FileList;

    if (!files || files.length === 0) {
      this.isFileInvalid = true;
      this.selectedFiles = [];
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff', 'image/x-icon', 'image/heic', 'text/csv',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];


    this.selectedFiles = [];
    this.previewFiles = []; // store previews (images or PDF icons)

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // check type
      if (!allowedTypes.includes(file.type)) {
        this.isFileInvalid = true;
        this.selectedFiles = [];
        this.fileInput.nativeElement.value = '';
        this.notyf.error('Only PDF and image files are allowed.');
        return;
      }

      this.selectedFiles.push(file);

      // preview only for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          this.previewFiles.push({
            url: this.sanitizer.bypassSecurityTrustUrl(reader.result as string),
            type: file.type,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        // push a placeholder for PDFs
        this.previewFiles.push({
          url: 'assets/pdf-icon.png', // use your own PDF icon asset
          type: file.type,
          name: file.name
        });
      }
    }

    this.isFileInvalid = false;
  }

  fileType: any;
  originalList: any = []
  async fetchReimbursement() {
    this.ReimbursementList = [];
    this.originalList = [];

    this.payroll.fetchReimbursementList().subscribe({
      next: (data) => {
        if (data['status'] === true) {
          // Map the reimbursement list and fix the image URL path
          this.ReimbursementList = data.data.map((item: any) => ({
            ...item,
            files: item.files.map((f: any) => ({
              ...f,
              image: `${this.baseurl}${f.image}`
            }))
          }));


          this.originalList = [...this.ReimbursementList];
        } else {
          this.notyf.error(data['message']);
        }
      },
      error: (err) => {
        console.error('Error fetching reimbursement list:', err);
        this.notyf.error('Failed to fetch reimbursement list.');
      },
    });
  }


  onSubmit() {
    if (!ValidationUtil.showRequiredError('toDate', this.obj.toDate, this.notyf)) {
      return;
    }
    if (!ValidationUtil.showRequiredError('amount', this.obj.amount, this.notyf)) {
      return;
    }
    if (!ValidationUtil.showRequiredError('fromDate', this.obj.fromDate, this.notyf)) {
      return;
    }
    if (!ValidationUtil.showRequiredError('employeeId', this.obj.employeeId, this.notyf)) {
      return;
    }
    const formData = new FormData();
    formData.append('amount', this.obj.amount);
    formData.append('toDate', this.obj.toDate);
    formData.append('fromDate', this.obj.fromDate);
    formData.append('employeeId', this.obj.employeeId);
    formData.append('remark', this.obj.remark);
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        formData.append('images', file, file.name); // note 'images' as field name
      });
    } else {
      Swal.fire({
        toast: true,
        position: "top",
        showConfirmButton: false,
        icon: "warning",
        timer: 5000,
        title: "Select at least one file to upload",
      });
      return;
    }


    this.payroll.addReimbursement(formData).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchReimbursement();
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
    if (this.obj?.image) {
      const fileUrl = `${this.obj.image}`; // ✅ adjust your API file path
      this.sanitizedImage = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
      this.fileType = this.obj.doc_type;
    } else {
      this.sanitizedImage = null;
      this.fileType = null;
    }
  }
  updatedata() {
    const formData = new FormData();
    formData.append('amount', this.obj.amount);
    formData.append('toDate', this.obj.toDate);
    formData.append('fromDate', this.obj.fromDate);
    formData.append('employeeId', this.obj.employeeId);
    formData.append('remark', this.obj.remark);
    formData.append('id', this.obj.id);
    if (this.selectedFiles && this.selectedFiles.length > 0) {
      this.selectedFiles.forEach(file => {
        formData.append('images', file, file.name); // use 'images' as field name
      });
    } else {
      if (this.obj.image) {
        formData.append('image', this.obj.image);
        formData.append('doc_type', this.obj.doc_type);
      } else {
        this.notyf.error('Select a file to upload')
        return;
      }

      // Swal.fire({
      //   toast: true,
      //   position: "top",
      //   showConfirmButton: false,
      //   icon: "warning",
      //   timer: 5000,
      //   title: "Select a file to upload",
      // });

    }
    this.payroll.updateReimbursement(formData).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchReimbursement();
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
        this.deleteReimbursement(data)
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
  deleteReimbursement(data: any) {
    this.payroll.deleteReimbursement(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchReimbursement();
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
    const control = this.ReimbursementForm.get(field);
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


  imageUrls: any;
  openModal1(imageUrl: any) {
    this.imageUrls = imageUrl;
    setTimeout(() => {
      const modalElement = document.getElementById('imageModal1');
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    }, 0);
  }
  statuschange(item: any, status: any) {
    let newObj: any = {}
    newObj = Object.assign({}, item)
    // newObj['id']=item.id
    newObj['status'] = status
    // newObj['employeeId']=item.employeeId

    this.payroll.updateReimbursementStatus(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchReimbursement();
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

}
