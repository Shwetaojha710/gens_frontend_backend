import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { FaceAttendanceService } from '../../services/face-attendance.service';

@Component({
  selector: 'app-ai-face-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ai-face-dashboard.component.html',
  styleUrl: './ai-face-dashboard.component.css',
})
export class AiFaceDashboardComponent implements OnInit {
  notyf = new Notyf();
  loading = false;
  data: any = {};
  cameras: any[] = [];
  serviceOk: boolean | null = null;

  constructor(
    private faceApi: FaceAttendanceService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.faceApi.dashboard().subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.status === 'expired') {
          this.router.navigate(['login']);
          return;
        }
        if (res?.status) {
          this.data = res.data || {};
        } else {
          this.notyf.error(res?.message || 'Failed to load dashboard');
        }
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Dashboard request failed');
      },
    });

    this.faceApi.listCameras().subscribe({
      next: (res) => {
        if (res?.status) this.cameras = res.data || [];
      },
    });

    this.faceApi.health().subscribe({
      next: (res) => {
        this.serviceOk = !!res?.status && !!res?.data?.faceService?.ok;
      },
      error: () => {
        this.serviceOk = false;
      },
    });
  }
}
