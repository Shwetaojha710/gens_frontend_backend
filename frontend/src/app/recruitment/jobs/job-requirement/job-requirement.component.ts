import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { SearchPaginationComponent } from '../../../master/search-pagination/search-pagination.component';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MasterService } from '../../../services/master.service';
import { MessagingService } from '../../../services/messaging.service';
import { StatusService } from '../../../services/status.service';
import { JobService } from '../../../services/job.service';
import { TagInputModule } from 'ngx-chips';
import { InterviewService } from '../../../services/interview.service';

@Component({
  selector: 'app-job-requirement',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent, TagInputModule],
  templateUrl: './job-requirement.component.html',
  styleUrl: './job-requirement.component.css'
})

export class JobRequirementComponent {
  obj: any = {}
  notyf: Notyf;

  back() {
    this.obj = {}
    this.createFlag = false

  }
  getCandidatePreferenceLabel(value: any): string {
    const preference = this.candidatePreferenceOptions.find(
      (item: any) => item.value === value
    );
    return preference?.label || value || '-';
  }

  getInterviewRoundDisplay(item: any): string {
    if (Array.isArray(item?.interview_round_data) && item.interview_round_data.length) {
      return item.interview_round_data
        .map((round: any) => round?.round_name)
        .filter(Boolean)
        .join(', ');
    }

    if (Array.isArray(item?.interview_round_names) && item.interview_round_names.length) {
      return item.interview_round_names.join(', ');
    }

    return '-';
  }
  status: any = [{ value: 'open', label: 'Open' }, { value: 'draft', label: 'Draft' }, { value: 'close', label: 'Closed' }]
  expireDays = [
    { value: 14, label: '14 days' },
    { value: 21, label: '21 days' },
    { value: 30, label: '30 days' },
    { value: 0,  label: 'No expiry' },
  ];
  candidatePreferenceOptions: any = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'both', label: 'Both' }
  ]
  EmployeeForm!: FormGroup;
  EmployeeList = [];
  editingId: number | null = null;
  minDate: any
  constructor(
    private fb: FormBuilder,
    private master: MasterService,
    public statusService: StatusService,
    public jobService: JobService,
    private interviewService: InterviewService,
    private router: Router,
    public messagingService: MessagingService
  ) {
    this.EmployeeForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
  }
  // This will return either today (for "from date") or selected fromDate (for "to date")
  getToDateMin(): string {
    return this.obj['fromDate'] || this.minDate;
  }
  monthList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  yearList: any = [];
  async ngOnInit() {
    await this.getJobRequirementList()
    await this.empList()

    await this.messagingService.initMessaging();
    const token = await this.messagingService.requestPermission();
    console.log('FCM Token after init:', token);
    await this.getYear()
    const year = new Date().getFullYear()
    this.obj['year'] = this.yearList.find((item: any) => item.value == year);
    await this.DepartmentDD()
    await this.skillsDD()
    await this.getEmploymentTypes();
    await this.getInterviewRounds();
  }
  getUserStatusClass(status: any): string {
    switch (status) {
      case 'draft': return 'badge-light-secondary';
      case 'closed': return 'badge-outline-danger';
      case 'open': return 'bg-light-success';
      default: return 'bg-light-secondary';
    }
  }

  skills: string[] = [];

  addSkill(event: any) {
    event.preventDefault();
    const value = event.target.value.trim();

    if (value && !this.skills.includes(value)) {
      this.skills.push(value);
    }

    event.target.value = '';
  }

  removeSkill(index: number) {
    this.skills.splice(index, 1);
  }
  departmentDD: any = []
  async DepartmentDD() {

    this.departmentDD = []
    let obj: any = {}
    this.master.Departmentsdd(obj).subscribe({
      next: (response: any) => {

        let message = response.message ? response.message : 'Data found Successfully';


        if (response.status === true) {
          this.departmentDD = response.data;

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
        this.notyf.error(err?.error?.message)
      }
    });
  }
  employmentTypes: any[] = [];
  interviewRounds: any[] = [];
  async getEmploymentTypes() {
    let obj: any = {}
    // obj["branchId"]=this.personalDetails["branchId"]
    this.employmentTypes = [];
    this.master.getEmploymentTypes(obj).subscribe(data => {
      this.employmentTypes = data.data || [];
    },
      (error: any) => {
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message)
        // alert('Failed to load employees. Please try again.');
      });
  }
  async getInterviewRounds() {
    this.interviewRounds = [];
    this.interviewService.getInterviewRound().subscribe({
      next: (response: any) => {
        if (response?.status === true) {
          this.interviewRounds = (response.data || []).map((item: any) => ({
            label: item.round_name,
            value: item.id,
            round_type: item['roundTypeData.name'] || item.round_type
          }));
          return;
        }

        if (response?.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }

        this.notyf.error(response?.message || 'Unable to load interview rounds');
      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err?.error?.message || 'Unable to load interview rounds');
      }
    });
  }
  skillDD: any = []
  async skillsDD() {

    this.departmentDD = []
    let obj: any = {}
    this.jobService.skillsDD(obj).subscribe({
      next: (response: any) => {

        let message = response.message ? response.message : 'Data found Successfully';


        if (response.status === true) {
          this.skillDD = response.data;

        }
        else if (response.status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          // this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        // this.notyf.error(err?.error?.message)
      }
    });
  }
  async getYear() {
    this.yearList = []
    this.master.getAttendanceYear().subscribe((data: { [x: string]: any; data: any; }) => {
      console.log(data)
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.yearList = data.data;

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;

  onSearch(term: string) {
    if (!term) {
      this.searchText = ''
      this.getJobRequirementList()
    } else {
      this.searchTerm = term.toLowerCase();
      this.currentPage = 1;
      this.applyFilters();
    }

    // this.loadEmployees()
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

  reset() {
    this.obj = {};
    this.createFlag = false;
    this.listflag = true;
    this.updateFlag = false;
  }

  updateform() {
    this.createFlag = false;
    this.listflag = true;
    this.updateFlag = false;
    this.obj['skills'] = this.skills;
    this.syncInterviewRoundPayload();

    this.jobService.updateJobRequirement(this.obj).subscribe(
      (response) => {

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.reset();
          this.getJobRequirementList()
        } else if (status === "expired") {
          this.notyf.error(message);
          this.router.navigate(["login"]);
        }
        else {
          this.notyf.error(message);
        }


      },
      (error) => {
        console.error('Error adding employee:', error);
        let errorMessage = error?.error?.message ? error?.error?.message : error?.message
        this.notyf.error(errorMessage || 'Failed to add employee. Please try again.');
        // console.error('Error adding employee:', error);
        // this.notyf.error('Failed to add employee. Please try again.');
      }

    )


  }
  async update(data: any) {
    this.obj = Object.assign({}, data);
    const extractedIds = this.extractInterviewRoundIds(data);
    // Normalize IDs to exactly match the `value` type in interviewRounds (handles string/number mismatch)
    this.obj['interview_round_ids'] = extractedIds.map((id: any) => {
      const match = this.interviewRounds.find((r: any) => String(r.value) === String(id));
      return match ? match.value : id;
    });
    // Restore skills tags from existing data
    this.skills = Array.isArray(data.skills)
      ? [...data.skills]
      : (typeof data.skills === 'string' && data.skills.trim()
        ? data.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []);
    this.createFlag = true;
    this.updateFlag = true;
  }
  filteredDesignation: any = []
  searchText: any = ''

  applyFilters() {


    let data = [...this.JobRequirementsList];
    const value = this.searchTerm || '';
    this.searchText = value.trim();
    if (this.searchText === '') {
      this.JobRequirementsList = [...this.originalList];
    } else {
      this.JobRequirementsList = this.originalList.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    // pagination
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.filteredDesignation = data.slice(start, end);

  }
  JobRequirementsList: any = []
  originalList: any = []
  async getJobRequirementList() {
    this.JobRequirementsList = []
    this.originalList = []
    this.filteredDesignation = []

    this.jobService.getJobRequirements(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {


          // this.notyf.success(message)
          this.JobRequirementsList = (response.data || []).map((item: any) =>
            this.normalizeJobRequirement(item)
          )
          this.originalList = [...this.JobRequirementsList]
          // pagination
          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.filteredDesignation = this.JobRequirementsList.slice(start, end);
        }
        else if (status == "expired") {
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




  EmpList: any = []
  async empList() {
    this.EmpList = []
    this.master.getemployeeList().subscribe((data: { [x: string]: any; data: any; }) => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        // data.data.shift();
        this.EmpList = data.data;

      }
      else if (data['status'] == 'expired') {
        this.router.navigate(['login'])
      }
      else {
        this.notyf.error(data['message']);
      }
    });

  }

  onSubmit() {

    this.obj['skills'] = this.skills
    this.syncInterviewRoundPayload();
    console.log(this.obj);

    this.jobService.ApplyJobRequirement(this.obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {

          this.notyf.success(message)
               this.resetForm();
          this.getJobRequirementList();

        }
        else if (status == "expired") {
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

  private normalizeJobRequirement(item: any) {
    const interviewRoundIds = this.extractInterviewRoundIds(item);
    return {
      ...item,
      interview_round_ids: interviewRoundIds,
      interview_round_names: this.getInterviewRoundNames(item, interviewRoundIds),

    };
  }

  private getInterviewRoundNames(item: any, interviewRoundIds: any[]): string[] {
    if (Array.isArray(item?.interview_rounds)) {
      return item.interview_rounds
        .map((round: any) => round?.round_name || round?.name || round)
        .filter(Boolean);
    }

    if (typeof item?.interview_rounds === 'string' && item.interview_rounds.trim()) {
      return item.interview_rounds
        .split(',')
        .map((name: string) => name.trim())
        .filter(Boolean);
    }

    return interviewRoundIds
      .map((id: any) => this.interviewRounds.find((round: any) => round.value === id)?.label)
      .filter(Boolean);
  }

  private syncInterviewRoundPayload() {
    const roundIds = Array.isArray(this.obj['interview_round_ids'])
      ? this.obj['interview_round_ids']
      : [];

    this.obj['interview_round_ids'] = roundIds;
    this.obj['interview_round'] = roundIds;   // matches API field name
    this.obj['interview_rounds'] = roundIds;
  }

  private extractInterviewRoundIds(data: any): any[] {
    if (Array.isArray(data?.interview_round_ids)) {
      return [...data.interview_round_ids];
    }

    // API returns field as 'interview_round' (array of UUID strings)
    if (Array.isArray(data?.interview_round)) {
      return data.interview_round.map((item: any) => item?.id || item).filter(Boolean);
    }

    if (Array.isArray(data?.interview_rounds)) {
      return data.interview_rounds.map((item: any) => item?.id || item).filter(Boolean);
    }

    if (typeof data?.interview_round_ids === 'string' && data.interview_round_ids.trim()) {
      return data.interview_round_ids.split(',').map((id: string) => id.trim()).filter(Boolean);
    }

    return [];
  }

  statuschange(item: any, status: any) {
    if (status == 'rejected') {
      Swal.fire({
        title: "Are you sure?",
        text: "Do you Want to Reject this",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.RejectLeave(item, status)

        } else if (

          result.dismiss === Swal.DismissReason.cancel
        ) {

        }
      });

    }
    else {
      let newObj: any = {}
      newObj = Object.assign({}, item)
      // newObj['id']=item.id
      newObj['status'] = status
      // newObj['employeeId']=item.employeeId

      this.master.UpdateApplyLeaveStatus(newObj).subscribe({
        next: (response: any) => {
          console.log('response', response);

          let message = response.message ? response.message : 'Data found Successfully';
          let status = this.statusService.handleResponseStatus(response.status, message);
          console.log(status)
          console.log("response", response);

          if (status === true) {

            this.notyf.success(message)
            this.getJobRequirementList();
            // this.resetForm();
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

  RejectLeave(item: any, status: any) {
    let newObj: any = {}
    newObj = Object.assign({}, item)
    // newObj['id']=item.id
    newObj['status'] = status
    // newObj['employeeId']=item.employeeId

    this.master.UpdateApplyLeaveStatus(newObj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.getJobRequirementList();
          // this.resetForm();
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
        this.DeleteJobRequirement(data)

      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {

      }
    });



  }
  DeleteJobRequirement(data: any) {
    this.jobService.deleteJobRequirement(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status == true) {
          this.notyf.success(message)
          this.obj = {}
          this.getJobRequirementList();
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
    this.skills = []
  }
  isInvalid(field: string): boolean {
    const control = this.EmployeeForm.get(field);
    return !!(control && control.touched && control.invalid);
  }

  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  selectedItem: any = null;

  opencreate() {
    this.obj = {}
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
  }

  viewItem(item: any): void {
    this.selectedItem = item;
    const el = document.getElementById('jobReqViewModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeViewModal(): void {
    const el = document.getElementById('jobReqViewModal');
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
    this.selectedItem = null;
  }

}
