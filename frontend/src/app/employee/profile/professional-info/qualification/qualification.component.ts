import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../../../services/master.service';
import { StatusService } from '../../../../services/status.service';
import { ValidationUtil } from '../../../../shared/utils/validation.util';
import { DataService } from '../../../../services/data.service';
import * as bootstrap from 'bootstrap';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-qualification',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './qualification.component.html',
  styleUrl: './qualification.component.css'
})


export class QualificationComponent {
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
  DocumentForm!: FormGroup;
  DocumentList: any = [];
  editingId: number | null = null;
  personalDetails: any = {}
  constructor(
    private fb: FormBuilder,
    private Documentervice: MasterService,
    public statusService: StatusService,
    private router: Router, public dataService: DataService,
    private sanitizer: DomSanitizer,
  ) {

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.notyf = new Notyf();
  }
  baseurl: any;
  async ngOnInit() {
    this.baseurl = this.Documentervice.getBaseUrl();
    await this.fetchDocument();
    await this.documentdd()
  }
  docTypeList: any = []
  async documentdd() {
    this.docTypeList = []
    this.Documentervice.getDocumentDD().subscribe(data => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.docTypeList = data.data;
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

  async fetchDocument() {
    this.DocumentList = []
    let obj: any = {}
    obj['employeeId'] = this.personalDetails.id
    console.log(obj, "object data ")
    this.Documentervice.getDocument(obj).subscribe(data => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.DocumentList = data.data;
        for (let i = 0; i < this.DocumentList.length; i++) {
          this.DocumentList[i]['doc_name'] = `${this.baseurl}/${this.DocumentList[i]['doc_name']}`
        }
      } else {
        this.notyf.error(data['message']);
      }
    });


  }

  onSubmit() {
    if (!ValidationUtil.showRequiredError('Document type', this.obj.type, this.notyf)) {
      return;
    }


    const uploadData = new FormData();
    uploadData.append('type', this.obj['type']);
    uploadData.append('employeeId', this.personalDetails.id)
    if (this.selectedFile) {
      uploadData.append('doc_name', this.selectedFile, this.selectedFile.name);
    } else {

      this.notyf.error("Select a file to upload")
      // Swal.fire({
      //   toast: true,
      //   position: "top",
      //   showConfirmButton: false,
      //   icon: "warning",
      //   timer: 5000,
      //   title: "Select a file to upload",
      // });
      return;
    }

    this.Documentervice.addDocument(uploadData).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.fileInput.nativeElement.value = '';
          this.notyf.success(message)
          this.fetchDocument();
          this.resetForm();
        }
        else if (status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.fileInput.nativeElement.value = '';
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
    if (this.obj?.doc_name) {
      const fileUrl = `${this.obj.doc_name}`; // ✅ adjust your API file path
      this.sanitizedImage = this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
      this.fileType = this.obj.doc_type;
    } else {
      this.sanitizedImage = null;
      this.fileType = null;
    }
    this.documentdd()
  }
  updatedata() {

    const uploadData = new FormData();
    uploadData.append('type', this.obj['type']);
    uploadData.append('employeeId', this.personalDetails.id)
    uploadData.append('id', this.obj.id)
    uploadData.append('status', this.personalDetails.status)
    uploadData.append('typeName', this.personalDetails.typeName)
    if (this.selectedFile) {
      uploadData.append('doc_name', this.selectedFile, this.selectedFile.name);
    } else {

      if (this.obj.doc_name) {
        uploadData.append('doc_name', this.obj.doc_name);
        uploadData.append('doc_type', this.obj.doc_type);
      } else {
        this.notyf.error('Select a file to upload')
        return;
      }
    }


    this.Documentervice.updateDocument(uploadData).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchDocument();
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
        this.deleteDocument(data)
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
  deleteDocument(data: any) {
    this.Documentervice.deleteDocument(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchDocument();
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

  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
  }
  isInvalid(field: string): boolean {
    const control = this.DocumentForm.get(field);
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
    this.sanitizedImage = null
  }

  isFileInvalid: boolean = false;
  selectedFile: File | null = null;
  sanitizedImage: any;
  fileType: any;
  onFileChange(event: any) {
    const file = event.target.files[0];

    if (!file) {
      this.isFileInvalid = true;
    } else {

      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

      if (!allowedTypes.includes(file.type)) {
        this.isFileInvalid = true;
        this.selectedFile = null;
        this.fileInput.nativeElement.value = '';
        this.notyf.error('Only PDF and image files are allowed.');
        return;
      }

      this.isFileInvalid = false;
      this.selectedFile = event.target.files[0]
      // Save the file to a model or FormData here
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      this.sanitizedImage = this.sanitizer.bypassSecurityTrustUrl(imageUrl);
      this.fileType = file.type; // store type for template
    };
    reader.readAsDataURL(file);
  }
  close() {
    this.sanitizedImage = null;
    this.selectedFile = null;
    this.isFileInvalid = false;
    this.fileInput.nativeElement.value = '';
    this.obj.doc_name = null
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

}
