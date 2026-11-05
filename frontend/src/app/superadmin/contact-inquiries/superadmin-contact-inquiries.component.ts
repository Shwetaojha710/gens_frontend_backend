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
  company?: string;
  phone?: string;
  employees?: string;
  notes?: string;
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

  /** Parse "Company: … / Phone: … / Number of Employees: … / Notes: …" from composed message. */
  private enrichRow(row: ContactInquiryRow): ContactInquiryRow {
    const msg = String(row.message || '');
    const pick = (label: string) => {
      const re = new RegExp(`${label}:\\s*(.+)`, 'i');
      const m = msg.match(re);
      return m?.[1]?.trim() || '';
    };
    const company = pick('Company');
    const phone = pick('Phone');
    const employees = pick('Number of Employees');
    let notes = pick('Notes');
    if (notes === '(none)') notes = '';
    return {
      ...row,
      company: company || '—',
      phone: phone || '—',
      employees: employees || '—',
      notes: notes || (company || phone ? '' : msg),
    };
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
            this.notyf.error(data?.message || 'Could not load demo requests.');
            this.items = [];
            this.total = 0;
            return;
          }
          this.total = data.data?.total ?? 0;
          this.items = (data.data?.items ?? []).map((r) => this.enrichRow(r));
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
