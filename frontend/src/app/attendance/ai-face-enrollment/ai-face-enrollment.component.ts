import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { FaceAttendanceService } from '../../services/face-attendance.service';
import { MasterService } from '../../services/master.service';

@Component({
  selector: 'app-ai-face-enrollment',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './ai-face-enrollment.component.html',
  styleUrl: './ai-face-enrollment.component.css',
})
export class AiFaceEnrollmentComponent implements OnInit, OnDestroy {
  notyf = new Notyf();
  employees: any[] = [];
  selectedEmp: any = null;
  files: File[] = [];
  faceRows: any[] = [];
  enrolled: any[] = [];
  uploading = false;
  webcamOn = false;
  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl?: ElementRef<HTMLCanvasElement>;
  private stream: MediaStream | null = null;

  constructor(
    private faceApi: FaceAttendanceService,
    private master: MasterService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // get-emp-list returns [{ label: "Name-empCode", value: uuid }, { label: "All", value: "All" }, ...]
    this.master.getemployeeList().subscribe({
      next: (res) => {
        if (res?.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        if (res?.status !== true) {
          this.notyf.error(res?.message || 'Failed to load employees');
          this.employees = [];
          return;
        }
        const list = Array.isArray(res.data) ? res.data : [];
        this.employees = list.filter(
          (o: any) => o?.value && o.value !== 'All' && o.label,
        );
      },
      error: () => {
        this.notyf.error('Failed to load employee list');
        this.employees = [];
      },
    });
    this.loadEnrolled();
  }

  /** Selected ng-select value is emp UUID (bindValue=value). */
  get selectedEmployeeId(): string | null {
    if (!this.selectedEmp) return null;
    return typeof this.selectedEmp === 'string'
      ? this.selectedEmp
      : this.selectedEmp.value || this.selectedEmp.id || null;
  }

  ngOnDestroy(): void {
    this.stopWebcam();
  }

  loadEnrolled(): void {
    this.faceApi.enrolledList().subscribe({
      next: (res) => {
        if (res?.status) this.enrolled = res.data?.employees || [];
      },
    });
  }

  onEmployeeChange(): void {
    this.faceRows = [];
    const id = this.selectedEmployeeId;
    if (!id) return;
    this.faceApi.getEmployeeFaces(id).subscribe({
      next: (res) => {
        if (res?.status) this.faceRows = res.data || [];
      },
    });
  }

  onFileSelect(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const list = input.files ? Array.from(input.files) : [];
    this.files = list.filter((f) => f.type.startsWith('image/'));
  }

  async startWebcam(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      this.webcamOn = true;
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
        }
      });
    } catch {
      this.notyf.error('Webcam permission denied');
    }
  }

  stopWebcam(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.webcamOn = false;
  }

  captureWebcam(): void {
    const video = this.videoEl?.nativeElement;
    const canvas = this.canvasEl?.nativeElement;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `webcam_${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.files = [...this.files, file];
      this.notyf.success('Captured');
    }, 'image/jpeg', 0.92);
  }

  enroll(): void {
    const id = this.selectedEmployeeId;
    if (!id) {
      this.notyf.error('Select employee');
      return;
    }
    if (!this.files.length) {
      this.notyf.error('Add at least one photo');
      return;
    }
    this.uploading = true;
    this.faceApi.enroll(id, this.files, true).subscribe({
      next: (res) => {
        this.uploading = false;
        if (res?.status) {
          this.notyf.success(res.message || 'Enrolled');
          this.files = [];
          this.onEmployeeChange();
          this.loadEnrolled();
        } else {
          const rejected = res?.data?.rejected || [];
          const detail = rejected
            .map((r: any) => r.reason || r.filename)
            .filter(Boolean)
            .join(' | ');
          this.notyf.error(detail || res?.message || 'Enrollment failed');
        }
      },
      error: () => {
        this.uploading = false;
        this.notyf.error('Enrollment failed — is face service running?');
      },
    });
  }

  deactivate(): void {
    const id = this.selectedEmployeeId;
    if (!id) return;
    Swal.fire({
      title: 'Deactivate face recognition?',
      text: 'Employee will no longer match on cameras.',
      icon: 'warning',
      showCancelButton: true,
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.faceApi.deactivate(id).subscribe({
        next: (res) => {
          if (res?.status) {
            this.notyf.success('Deactivated');
            this.onEmployeeChange();
            this.loadEnrolled();
          } else this.notyf.error(res?.message || 'Failed');
        },
      });
    });
  }
}
