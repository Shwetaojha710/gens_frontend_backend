import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { FaceAttendanceService } from '../../services/face-attendance.service';

@Component({
  selector: 'app-ai-recognition-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-recognition-logs.component.html',
  styleUrl: './ai-recognition-logs.component.css',
})
export class AiRecognitionLogsComponent implements OnInit {
  notyf = new Notyf();
  logs: any[] = [];
  filterStatus = '';
  unknownOnly = false;

  statuses = [
    '',
    'matched',
    'attendance_written',
    'duplicate_skipped',
    'attendance_failed',
    'unknown',
  ];

  constructor(
    private faceApi: FaceAttendanceService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const body: any = { limit: 200 };
    if (this.unknownOnly) {
      this.faceApi.unknownFaces().subscribe({
        next: (res) => this.apply(res),
        error: () => this.notyf.error('Failed to load'),
      });
      return;
    }
    if (this.filterStatus) body.processingStatus = this.filterStatus;
    this.faceApi.recognitionLogs(body).subscribe({
      next: (res) => this.apply(res),
      error: () => this.notyf.error('Failed to load'),
    });
  }

  private apply(res: any): void {
    if (res?.status === 'expired') {
      this.router.navigate(['login']);
      return;
    }
    if (res?.status) this.logs = res.data || [];
    else this.notyf.error(res?.message || 'Failed');
  }
}
