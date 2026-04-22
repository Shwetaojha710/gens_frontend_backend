import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

export interface ContactInquiryRow {
  id: string;
  fullName: string;
  email: string;
  message: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
}

@Component({
  selector: 'app-superadmin-contact-inquiries',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './superadmin-contact-inquiries.component.html',
  styleUrl: './superadmin-contact-inquiries.component.css',
})
export class SuperadminContactInquiriesComponent implements OnInit {
  notyf = new Notyf();
  loading = true;
  total = 0;
  items: ContactInquiryRow[] = [];

  constructor(private api: SuperadminService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listContactMessages({ limit: 100, offset: 0 }).subscribe({
      next: (raw) => {
        try {
          const data = JSON.parse(raw) as {
            status?: boolean;
            message?: string;
            data?: { total?: number; items?: ContactInquiryRow[] };
          };
          if (!data?.status) {
            this.notyf.error(data?.message || 'Could not load messages.');
            this.items = [];
            this.total = 0;
            return;
          }
          this.total = data.data?.total ?? 0;
          this.items = data.data?.items ?? [];
        } catch {
          this.notyf.error('Invalid server response.');
          this.items = [];
        }
        this.loading = false;
      },
      error: () => {
        this.notyf.error('Request failed.');
        this.loading = false;
      },
    });
  }
}
