import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { FaceAttendanceService } from '../../services/face-attendance.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-camera-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-camera-management.component.html',
  styleUrl: './ai-camera-management.component.css',
})
export class AiCameraManagementComponent implements OnInit, OnDestroy {
  notyf = new Notyf();
  cameras: any[] = [];
  showForm = false;
  editingId: string | null = null;
  form: any = this.emptyForm();
  busyId: string | null = null;

  previewOpen = false;
  previewCamera: any = null;
  previewImgUrl: string | null = null;
  previewLoading = false;
  previewError = '';
  previewLive = true;
  previewInfo = '';
  private previewTimer: ReturnType<typeof setInterval> | null = null;
  private previewSub: Subscription | null = null;
  private previewInFlight = false;
  private previewStarted = false;

  cameraTypes = ['bullet', 'dome', 'other'];
  eventTypes = [
    { value: 'entry', label: 'Entry (Check-in)' },
    { value: 'exit', label: 'Exit (Check-out)' },
  ];

  constructor(
    private faceApi: FaceAttendanceService,
    private router: Router,
  ) {}

  emptyForm() {
    return {
      name: '',
      cameraType: 'bullet',
      rtspUrl: '',
      location: '',
      direction: '',
      eventType: 'entry',
      isActive: true,
    };
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.closePreview();
  }

  load(): void {
    this.faceApi.listCameras().subscribe({
      next: (res) => {
        if (res?.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        if (res?.status) this.cameras = res.data || [];
        else this.notyf.error(res?.message || 'Failed');
      },
      error: () => this.notyf.error('Failed to load cameras'),
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.showForm = true;
  }

  openEdit(c: any): void {
    this.editingId = c.id;
    this.form = {
      name: c.name,
      cameraType: c.cameraType,
      rtspUrl: '',
      location: c.location || '',
      direction: c.direction || '',
      eventType: c.eventType || 'entry',
      isActive: !!c.isActive,
    };
    this.showForm = true;
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = null;
  }

  save(): void {
    if (!this.form.name) {
      this.notyf.error('Name required');
      return;
    }
    if (!this.editingId && !this.form.rtspUrl) {
      this.notyf.error('RTSP URL required');
      return;
    }
    const req = this.editingId
      ? this.faceApi.updateCamera(this.editingId, this.form)
      : this.faceApi.createCamera(this.form);
    req.subscribe({
      next: (res) => {
        if (res?.status) {
          this.notyf.success(res.message || 'Saved');
          this.cancel();
          this.load();
        } else this.notyf.error(res?.message || 'Save failed');
      },
      error: () => this.notyf.error('Save failed'),
    });
  }

  remove(c: any): void {
    Swal.fire({
      title: 'Delete camera?',
      text: c.name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.faceApi.deleteCamera(c.id).subscribe({
        next: (res) => {
          if (res?.status) {
            this.notyf.success('Deleted');
            this.load();
          } else this.notyf.error(res?.message || 'Delete failed');
        },
      });
    });
  }

  test(c: any): void {
    this.busyId = c.id;
    this.faceApi.testCamera(c.id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res?.status) this.notyf.success(res.message || 'RTSP OK');
        else this.notyf.error(res?.message || 'RTSP failed');
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.notyf.error('Test failed');
      },
    });
  }

  start(c: any): void {
    this.busyId = c.id;
    this.faceApi.startCamera(c.id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res?.status) this.notyf.success('Recognition started');
        else this.notyf.error(res?.message || 'Start failed');
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.notyf.error('Start failed — is face service running?');
      },
    });
  }

  stop(c: any): void {
    this.busyId = c.id;
    this.faceApi.stopCamera(c.id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res?.status) this.notyf.success('Stopped');
        else this.notyf.error(res?.message || 'Stop failed');
        this.load();
      },
      error: () => {
        this.busyId = null;
        this.notyf.error('Stop failed');
      },
    });
  }

  // ── Smooth live preview (persistent RTSP session + ~5–8 fps poll) ────────

  openPreview(c: any): void {
    this.closePreview(false);
    this.previewCamera = c;
    this.previewOpen = true;
    this.previewLive = true;
    this.previewError = '';
    this.previewImgUrl = null;
    this.previewLoading = true;
    this.previewStarted = false;

    this.faceApi.previewStart(c.id, { max_width: 720, jpeg_quality: 60, target_fps: 8 }).subscribe({
      next: (res) => {
        if (res?.status === 'expired') {
          this.closePreview();
          this.router.navigate(['login']);
          return;
        }
        if (!res?.status) {
          this.previewLoading = false;
          this.previewError = res?.message || 'Could not start preview session';
          return;
        }
        this.previewStarted = true;
        this.fetchPreviewFrame(true);
        this.previewTimer = setInterval(() => {
          if (this.previewLive) this.fetchPreviewFrame();
        }, 180);
      },
      error: () => {
        this.previewLoading = false;
        this.previewError = 'Preview start failed — restart face service and try again';
      },
    });
  }

  closePreview(stopRemote = true): void {
    if (this.previewTimer) {
      clearInterval(this.previewTimer);
      this.previewTimer = null;
    }
    this.previewSub?.unsubscribe();
    this.previewSub = null;
    this.previewInFlight = false;

    const camId = this.previewCamera?.id;
    if (stopRemote && this.previewStarted && camId) {
      this.faceApi.previewStop(camId).subscribe({ error: () => null });
    }

    this.previewStarted = false;
    this.previewOpen = false;
    this.previewCamera = null;
    this.previewImgUrl = null;
    this.previewError = '';
    this.previewInfo = '';
    this.previewLoading = false;
  }

  togglePreviewLive(): void {
    this.previewLive = !this.previewLive;
    if (this.previewLive) this.fetchPreviewFrame(true);
  }

  refreshPreviewOnce(): void {
    this.fetchPreviewFrame(true);
  }

  private fetchPreviewFrame(force = false): void {
    if (!this.previewCamera?.id) return;
    if (this.previewInFlight && !force) return;

    this.previewInFlight = true;
    if (!this.previewImgUrl) this.previewLoading = true;

    this.previewSub?.unsubscribe();
    this.previewSub = this.faceApi.previewCamera(this.previewCamera.id).subscribe({
      next: (res) => {
        this.previewInFlight = false;
        this.previewLoading = false;
        if (res?.status === 'expired') {
          this.closePreview();
          this.router.navigate(['login']);
          return;
        }
        if (res?.status && res.data?.imageBase64) {
          this.previewError = '';
          this.previewImgUrl = `data:${res.data.contentType || 'image/jpeg'};base64,${res.data.imageBase64}`;
          const age = res.data.ageMs != null ? `${res.data.ageMs}ms` : '';
          this.previewInfo = `${res.data.width || '?'}×${res.data.height || '?'} · live session · age ${age}`;
        } else {
          this.previewError = res?.message || 'Could not load stream frame';
        }
      },
      error: () => {
        this.previewInFlight = false;
        this.previewLoading = false;
        this.previewError = 'Preview failed — is face service running and RTSP reachable?';
      },
    });
  }
}
